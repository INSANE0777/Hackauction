import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from '@studio-freight/lenis'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

export function useScroll() {
  const initScroll = () => {
    // Initialize Lenis for smooth scrolling
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    })

    // Connect lenis to ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update)

    // Connect gsap ticker to lenis
    gsap.ticker.add((time) => {
      lenis?.raf(time * 1000)
    })

    // Make ScrollTrigger work with Lenis
    gsap.ticker.lagSmoothing(0)
  }

  const scrollTo = (target: string | HTMLElement) => {
    if (lenis) {
      lenis.scrollTo(target)
    }
  }

  const destroyScroll = () => {
    if (lenis) {
      lenis.destroy()
      lenis = null
    }
    
    // Clean up ScrollTrigger
    ScrollTrigger.getAll().forEach(trigger => trigger.kill())
  }

  return {
    initScroll,
    scrollTo,
    destroyScroll
  }
}