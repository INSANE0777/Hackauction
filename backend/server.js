require("dotenv").config();
const http = require("http");
const { neon } = require("@neondatabase/serverless");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const sql = neon(process.env.DATABASE_URL);
const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware function moved outside of route handlers
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Unauthorized" }));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid token" }));
    }
    req.user = user;
    next();
  });
}

async function parseJSONBody(req) {
  return new Promise((resolve) => {
    let body = [];
    req.on("data", (chunk) => body.push(chunk));
    req.on("end", () => {
      if (body.length === 0) return resolve({});
      try {
        return resolve(JSON.parse(Buffer.concat(body).toString()));
      } catch (e) {
        return resolve({});
      }
    });
  });
}

const requestHandler = async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Default route handler
    if (req.url === "/" || req.url === "") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          message: "Welcome to HACKAUCTION API",
          version: "1.0.0",
          endpoints: {
            signup: "/api/signup",
            login: "/api/login",
            protected: "/api/protected/*",
          },
        })
      );
    }

    // Protected routes
    if (req.url.startsWith("/api/protected")) {
      return verifyToken(req, res, () => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Protected route accessed successfully",
            user: req.user,
          })
        );
      });
    }

    if (req.url === "/api/signup" && req.method === "POST") {
      const { email, password } = await parseJSONBody(req);

      if (!email || !password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Missing required fields" }));
      }

      try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const userId = uuidv4();

        await sql`
          INSERT INTO users (id, email, password_hash)
          VALUES (${userId}, ${email}, ${hashedPassword})
        `;

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "User created successfully" }));
      } catch (error) {
        // Handle duplicate email error
        if (error.code === "23505" && error.constraint === "users_email_key") {
          res.writeHead(409, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Email already exists" }));
        }
        throw error; // Re-throw other errors to be caught by the outer catch block
      }
    } else if (req.url === "/api/login" && req.method === "POST") {
      const { email, password } = await parseJSONBody(req);

      if (!email || !password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Missing required fields" }));
      }

      const [user] = await sql`
        SELECT * FROM users WHERE email = ${email}
      `;

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid credentials" }));
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Login successful",
          token: token,
        })
      );
    } else if (req.url === "/api/agent/fact-check" && req.method === "POST") {
      return verifyToken(req, res, async () => {
        const body = await parseJSONBody(req);
        const { text } = body;

        if (!text) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Missing required text field" }));
        }

        try {
          console.log('Processing fact check request for text:', text);
          console.log('User ID:', req.user.userId);

          // First, make the fact check request to the agent
          const agentResponse = await fetch('http://localhost:3001/api/agent/fact-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
          });

          if (!agentResponse.ok) {
            throw new Error('Failed to get fact check from agent');
          }

          const agentResult = await agentResponse.json();
          console.log('Received agent response:', agentResult);

          // Parse the report
          const reportData = agentResult.result?.report || '';
          const parsedReport = parseReportText(reportData);
          console.log('Parsed report:', parsedReport);

          // Prepare the data for storage
          const verifiedElements = parsedReport.verified || [];
          const unverifiedClaims = parsedReport.unverified || [];
          const contradictions = parsedReport.contradictions || [];
          const sources = agentResult.result?.search_results || [];

          console.log('Storing fact check in database with data:', {
            userId: req.user.userId,
            text,
            verdict: parsedReport.verdict,
            confidence: parsedReport.confidence,
            verifiedElements,
            unverifiedClaims,
            contradictions,
            sourcesCount: sources.length
          });

          // Store in database
          const [factCheck] = await sql`
            INSERT INTO fact_checks (
              user_id,
              query_text,
              verdict,
              confidence,
              verified_elements,
              unverified_claims,
              contradictions,
              sources
            ) VALUES (
              ${req.user.userId},
              ${text},
              ${parsedReport.verdict || 'Not Available'},
              ${parsedReport.confidence || 'Low'},
              ${sql.array(verifiedElements, 'text')},
              ${sql.array(unverifiedClaims, 'text')},
              ${sql.array(contradictions, 'text')},
              ${JSON.stringify(sources)}
            )
            RETURNING *
          `;

          console.log('Successfully stored fact check:', factCheck);

          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            message: "Fact check completed and stored successfully",
            result: agentResult.result,
            factCheck
          }));
        } catch (error) {
          console.error("Error processing fact check:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ 
            error: "Failed to process fact check",
            details: error.message
          }));
        }
      });
    } else if (req.url === "/api/agent/fact-checks" && req.method === "GET") {
      return verifyToken(req, res, async () => {
        try {
          const factChecks = await sql`
            SELECT * FROM fact_checks 
            WHERE user_id = ${req.user.userId}
            ORDER BY created_at DESC
          `;

          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ factChecks }));
        } catch (error) {
          console.error("Error fetching fact checks:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Failed to fetch fact checks" }));
        }
      });
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Endpoint not found" }));
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Internal server error", details: error.message })
    );
  }
};

// Add database initialization function
async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // Create users table
    console.log('Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    console.log('Users table created successfully');

    // Create fact_checks table
    console.log('Creating fact_checks table...');
    await sql`
      CREATE TABLE IF NOT EXISTS fact_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        query_text TEXT NOT NULL,
        verdict TEXT,
        confidence TEXT,
        verified_elements TEXT[],
        unverified_claims TEXT[],
        contradictions TEXT[],
        sources JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    console.log('Fact checks table created successfully');

    // Create indexes
    console.log('Creating indexes...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_fact_checks_user_id ON fact_checks(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_fact_checks_created_at ON fact_checks(created_at)
    `;
    console.log('Indexes created successfully');

    // Verify tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Current tables in database:', tables.map(t => t.table_name));

  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error; // Re-throw to handle in server startup
  }
}

// Add helper function to parse report text
function parseReportText(reportText) {
  if (!reportText || typeof reportText !== 'string') {
    return {
      verdict: 'Not Available',
      confidence: 'Low',
      verified: [],
      unverified: [],
      contradictions: []
    };
  }

  // Clean the report text and remove asterisks
  const cleanedText = reportText.trim().replace(/\*\*/g, '');

  // Try to match verdict with multiple possible formats
  const verdictMatch =
    cleanedText.match(/Verdict:?\s+([^\n]+)/i) ||
    cleanedText.match(/verdict:?\s+([^\n]+)/i);

  // Try to match confidence with multiple possible formats
  const confidenceMatch =
    cleanedText.match(/Confidence Level:?\s+([^\n]+)/i) ||
    cleanedText.match(/Confidence:?\s+([^\n]+)/i);

  // Try to match verified elements with multiple possible formats
  const verifiedMatch =
    cleanedText.match(/Verified Elements:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i) ||
    cleanedText.match(/Verified:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i);

  // Try to match unverified elements with multiple possible formats
  const unverifiedMatch =
    cleanedText.match(/Unverified Elements:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i) ||
    cleanedText.match(/Unverified Claims:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i);

  // Try to match contradictions with multiple possible formats
  const contradictionsMatch =
    cleanedText.match(/Contradictions:(?:\n|:)((?:[\s-]*[^\n]+\n?)+)/i);

  // Helper to safely split and map matched groups
  const splitAndMap = (matchResult) => {
    if (!matchResult || !matchResult[1]) return [];
    return matchResult[1]
      .split('\n')
      .map(line => line.replace(/^[\s-]*/, '').trim())
      .filter(line => line.length > 0);
  };

  return {
    verdict: verdictMatch ? verdictMatch[1].trim() : 'Not Available',
    confidence: confidenceMatch ? confidenceMatch[1].trim() : 'Low',
    verified: splitAndMap(verifiedMatch),
    unverified: splitAndMap(unverifiedMatch),
    contradictions: splitAndMap(contradictionsMatch)
  };
}

// Modify server startup to ensure database is initialized
const startServer = async () => {
  try {
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('Database initialized successfully');

    const server = http.createServer(requestHandler);
    server.listen(3000, () => {
      console.log('Server running at http://localhost:3000');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1); // Exit if we can't initialize the database
  }
};

// Start the server
startServer();
