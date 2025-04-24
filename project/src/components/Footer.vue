<script setup lang="ts">
// Footer component
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-logo">
          <span class="logo-text">Pop<span class="logo-highlight">News</span></span>
        </div>
        
        <div class="footer-links">
          <div class="footer-column">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
          
          <div class="footer-column">
            <h4>Product</h4>
            <ul>
              <li><a href="#">Features</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">API</a></li>
            </ul>
          </div>
          
          <div class="footer-column">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">Documentation</a></li>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Community</a></li>
            </ul>
          </div>
          
          <div class="footer-column">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="footer-bottom">
        <div class="copyright">
          &copy; 2025 PopNews. All rights reserved.
        </div>
        <div class="social-links">
          <a href="#" class="social-link">Twitter</a>
          <a href="#" class="social-link">LinkedIn</a>
          <a href="#" class="social-link">GitHub</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background-color: var(--color-secondary);
  color: var(--color-text-light);
  padding: var(--spacing-5) 0;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--spacing-5);
  margin-bottom: var(--spacing-5);
}

.footer-logo {
  font-family: var(--font-mono);
  font-size: 1.8rem;
  font-weight: 700;
}

.logo-text {
  color: var(--color-text-light);
}

.logo-highlight {
  color: var(--color-primary);
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-5);
}

.footer-column h4 {
  color: var(--color-text-light);
  font-size: 1.2rem;
  margin-bottom: var(--spacing-2);
}

.footer-column ul {
  list-style: none;
}

.footer-column li {
  margin-bottom: var(--spacing-1);
}

.footer-column a {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-column a:hover {
  color: var(--color-primary);
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.copyright {
  font-size: 0.9rem;
  opacity: 0.7;
}

.social-links {
  display: flex;
  gap: var(--spacing-3);
}

.social-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.2s ease;
}

.social-link:hover {
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    gap: var(--spacing-4);
  }
  
  .footer-links {
    gap: var(--spacing-4);
  }
  
  .footer-column {
    min-width: 120px;
  }
  
  .footer-bottom {
    flex-direction: column;
    gap: var(--spacing-3);
    text-align: center;
  }
}
</style>