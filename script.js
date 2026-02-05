const container = document.getElementById('game-container');
const dotCount = 4;
const dots = [];
const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33']; // Red, Green, Blue, Yellow

// Dot class to manage state and behavior
class Dot {
    constructor(id, color) {
        this.element = document.createElement('div');
        this.element.classList.add('dot');
        this.element.style.backgroundColor = color;
        this.element.id = `dot-${id}`;
        
        // Random initial position
        this.x = Math.random() * (window.innerWidth - 50);
        this.y = Math.random() * (window.innerHeight - 50);
        
        // Random velocity
        this.vx = (Math.random() - 0.5) * 10; // Speed range -5 to 5
        this.vy = (Math.random() - 0.5) * 10;
        
        // Ensure non-zero speed
        if (Math.abs(this.vx) < 1) this.vx = 2;
        if (Math.abs(this.vy) < 1) this.vy = 2;

        this.updatePosition();
        container.appendChild(this.element);
    }

    update() {
        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        const maxX = window.innerWidth - 50; // 50 is dot width
        const maxY = window.innerHeight - 50; // 50 is dot height

        if (this.x <= 0 || this.x >= maxX) {
            this.vx *= -1;
            this.x = Math.max(0, Math.min(this.x, maxX));
        }

        if (this.y <= 0 || this.y >= maxY) {
            this.vy *= -1;
            this.y = Math.max(0, Math.min(this.y, maxY));
        }

        this.updatePosition();
    }

    updatePosition() {
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }
}

// Initialize dots
function init() {
    for (let i = 0; i < dotCount; i++) {
        dots.push(new Dot(i, colors[i % colors.length]));
    }
    animate();
}

// Animation loop
function animate() {
    dots.forEach(dot => dot.update());
    requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener('resize', () => {
    // Optional: could adjust logic to keep dots inside if window shrinks
});

init();
