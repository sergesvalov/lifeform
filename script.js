const container = document.getElementById('game-container');
const initialDotCount = 4;
let dots = [];
let hunters = [];
let foods = [];
const colors = ['#FF5733', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF3'];
const PREDATOR_COLOR = '#800000';
const HUNTER_COLOR = '#00FFFF';
let collisionCounter = 0;
let animationId;

// Game Configuration
const config = {
    predatorRate: 5,
    initialFood: 10,
    enableHabitats: true,
    enableHunters: true,
    fightRate: 4
};

let predatorCollisionCounter = 0;

const dotSize = 50;
const radius = dotSize / 2;

// UI Elements
const rateInput = document.getElementById('predator-rate');
const rateDisplay = document.getElementById('predator-rate-val');
const foodInput = document.getElementById('food-count');
const habitatCheck = document.getElementById('toggle-habitats');
const hunterCheck = document.getElementById('toggle-hunters');
const fightRateInput = document.getElementById('fight-rate');
const restartBtn = document.getElementById('restart-btn');

// UI Listeners
rateInput.addEventListener('input', (e) => {
    config.predatorRate = parseInt(e.target.value);
    rateDisplay.innerText = config.predatorRate;
});

foodInput.addEventListener('change', (e) => {
    config.initialFood = parseInt(e.target.value);
});

habitatCheck.addEventListener('change', (e) => {
    config.enableHabitats = e.target.checked;
    // Optional: Reset existing habitats if toggled off? 
    // For now, let's keep it simple: applies to movement logic immediately.
});

hunterCheck.addEventListener('change', (e) => {
    config.enableHunters = e.target.checked;
});

fightRateInput.addEventListener('change', (e) => {
    config.fightRate = parseInt(e.target.value);
});

restartBtn.addEventListener('click', restartGame);

class Hunter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 60;
        this.element = document.createElement('div');
        this.element.classList.add('dot');
        this.element.style.backgroundColor = HUNTER_COLOR;
        this.element.style.width = `${this.size}px`;
        this.element.style.height = `${this.size}px`;
        this.element.style.zIndex = 100; // Above others
        this.element.style.boxShadow = '0 0 20px #00FFFF';

        container.appendChild(this.element);

        this.vx = 0;
        this.vy = 0;
        this.speed = 4;
        this.energy = 1000; // ~16 seconds of life
        this.markedForDeletion = false;
        this.isHunter = true;
    }

    update() {
        if (this.markedForDeletion) return;
        this.energy -= 1;

        if (this.energy <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // Find nearest predator
        let nearestPredator = null;
        let minDist = Infinity;
        let predatorCount = 0;

        dots.forEach(dot => {
            if (dot.isPredator && !dot.markedForDeletion) {
                predatorCount++;
                const dx = dot.x - this.x;
                const dy = dot.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    nearestPredator = dot;
                }
            }
        });

        // Die if no predators left
        if (predatorCount === 0) {
            this.markedForDeletion = true;
            return;
        }

        if (nearestPredator) {
            const dx = nearestPredator.x - this.x;
            const dy = nearestPredator.y - this.y;
            const angle = Math.atan2(dy, dx);
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Keep inside bounds
        if (this.x < 0) this.x = 0;
        if (this.x > window.innerWidth - this.size) this.x = window.innerWidth - this.size;
        if (this.y < 0) this.y = 0;
        if (this.y > window.innerHeight - this.size) this.y = window.innerHeight - this.size;

        this.updatePosition();
    }

    updatePosition() {
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }
}

class Food {
    constructor() {
        this.size = Math.random() * 50 + 50;
        this.element = document.createElement('div');
        this.element.classList.add('food');
        this.element.style.width = `${this.size}px`;
        this.element.style.height = `${this.size}px`;

        this.x = Math.random() * (window.innerWidth - this.size);
        this.y = Math.random() * (window.innerHeight - this.size);
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;

        container.appendChild(this.element);
        this.markedForDeletion = false;
    }

    shrink() {
        this.size -= 10;
        if (this.size < 10) {
            this.markedForDeletion = true;
            this.element.remove();
        } else {
            this.element.style.width = `${this.size}px`;
            this.element.style.height = `${this.size}px`;
        }
    }
}

class Dot {
    constructor(id, color, x, y) {
        this.id = id;
        this.color = color;
        this.isPredator = color === PREDATOR_COLOR;
        this.element = document.createElement('div');
        this.element.classList.add('dot');
        this.element.style.backgroundColor = color;
        this.element.id = `dot-${id}`;
        this.size = dotSize; // Default size
        this.element.style.width = `${this.size}px`;
        this.element.style.height = `${this.size}px`;

        // Define Habitat (for Predators)
        if (this.isPredator && config.enableHabitats) {
            const hWidth = Math.random() * 400 + 200; // 200-600px width
            const hHeight = Math.random() * 400 + 200; // 200-600px height

            // Constrain habitat to window
            const minX = Math.random() * (window.innerWidth - hWidth);
            const minY = Math.random() * (window.innerHeight - hHeight);

            this.habitat = {
                minX: minX,
                maxX: minX + hWidth,
                minY: minY,
                maxY: minY + hHeight
            };
        } else {
            this.habitat = {
                minX: 0,
                maxX: window.innerWidth,
                minY: 0,
                maxY: window.innerHeight
            };
        }

        // Use provided position or random within habitat
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        } else {
            // Spawn inside habitat
            const bounds = this.getBounds();
            this.x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX - this.size);
            this.y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY - this.size);
        }

        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;

        if (Math.abs(this.vx) < 1) this.vx = 2;
        if (Math.abs(this.vy) < 1) this.vy = 2;

        this.updatePosition();
        container.appendChild(this.element);

        this.cooldown = 60;
        this.markedForDeletion = false;
        this.fertility = 0;
    }

    getBounds() {
        if (this.isPredator && config.enableHabitats && this.habitat) {
            // Use specific habitat
            return this.habitat;
        }
        // Global bounds
        return {
            minX: 0,
            maxX: window.innerWidth,
            minY: 0,
            maxY: window.innerHeight
        };
    }

    update() {
        if (this.markedForDeletion) return;
        if (this.cooldown > 0) this.cooldown--;

        this.x += this.vx;
        this.y += this.vy;

        const bounds = this.getBounds();
        const maxX = bounds.maxX - this.size;
        const maxY = bounds.maxY - this.size;

        if (this.x <= bounds.minX) { this.x = bounds.minX; this.vx *= -1; }
        if (this.x >= maxX) { this.x = maxX; this.vx *= -1; }
        if (this.y <= bounds.minY) { this.y = bounds.minY; this.vy *= -1; }
        if (this.y >= maxY) { this.y = maxY; this.vy *= -1; }

        this.updatePosition();
    }

    updatePosition() {
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
        this.element.style.width = `${this.size}px`;
        this.element.style.height = `${this.size}px`;
    }
}

function checkCollisions() {
    // 1. Dot vs Food (Same as before)
    for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        if (dot.markedForDeletion || dot.isPredator) continue;

        for (let j = 0; j < foods.length; j++) {
            const food = foods[j];
            if (food.markedForDeletion) continue;

            const dotCenterX = dot.x + dot.size / 2;
            const dotCenterY = dot.y + dot.size / 2;

            if (dotCenterX > food.x && dotCenterX < food.x + food.size &&
                dotCenterY > food.y && dotCenterY < food.y + food.size) {

                food.shrink();
                dot.fertility += 0.5;
            }
        }
    }

    // 2. Dot vs Dot
    for (let i = 0; i < dots.length; i++) {
        if (dots[i].markedForDeletion) continue;

        for (let j = i + 1; j < dots.length; j++) {
            if (dots[j].markedForDeletion) continue;

            const d1 = dots[i];
            const d2 = dots[j];

            const r1 = d1.size / 2;
            const r2 = d2.size / 2;
            const dx = (d1.x + r1) - (d2.x + r2);
            const dy = (d1.y + r1) - (d2.y + r2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < r1 + r2) {
                // Predator interaction
                if (d1.isPredator && d2.isPredator && d1.cooldown === 0 && d2.cooldown === 0) {
                    predatorCollisionCounter++;
                    if (predatorCollisionCounter % config.fightRate === 0) {
                        // Fight!
                        const winner = Math.random() < 0.5 ? d1 : d2;
                        const loser = winner === d1 ? d2 : d1;

                        winner.size *= 2;
                        loser.size /= 2;

                        if (loser.size < 10) {
                            loser.markedForDeletion = true;
                        }

                        // Reset cooldowns after fight
                        d1.cooldown = 60;
                        d2.cooldown = 60;
                    }
                } else if (d1.isPredator && !d2.isPredator) {
                    d2.markedForDeletion = true;
                    continue;
                }
                if (d2.isPredator && !d1.isPredator) {
                    d1.markedForDeletion = true;
                    continue;
                }

                // Resolve overlap
                const overlap = (r1 + r2) - distance;
                const angle = Math.atan2(dy, dx);
                const moveX = Math.cos(angle) * overlap / 2;
                const moveY = Math.sin(angle) * overlap / 2;

                d1.x += moveX;
                d1.y += moveY;
                d2.x -= moveX;
                d2.y -= moveY;

                // Elastic collision
                const tempVx = d1.vx;
                const tempVy = d1.vy;
                d1.vx = d2.vx;
                d1.vy = d2.vy;
                d2.vx = tempVx;
                d2.vy = tempVy;

                // Spawning Logic
                if (d1.cooldown === 0 && d2.cooldown === 0 && !d1.isPredator && !d2.isPredator) {
                    collisionCounter++;

                    if (collisionCounter % config.predatorRate === 0) {
                        const newDot = new Dot(Date.now(), PREDATOR_COLOR);
                        dots.push(newDot);
                    } else {
                        const baseSpawns = 0;
                        let totalSpawns = Math.floor(baseSpawns + d1.fertility + d2.fertility);

                        // Cap max spawns
                        if (totalSpawns > 4) totalSpawns = 4;

                        if (totalSpawns > 0) {
                            for (let k = 0; k < totalSpawns; k++) {
                                const parentColor = Math.random() < 0.5 ? d1.color : d2.color;

                                // Spawn near parent (d1) with slight offset
                                const offsetX = (Math.random() - 0.5) * 50;
                                const offsetY = (Math.random() - 0.5) * 50;
                                const spawnX = Math.max(0, Math.min(window.innerWidth, d1.x + offsetX));
                                const spawnY = Math.max(0, Math.min(window.innerHeight, d1.y + offsetY));

                                const newDot = new Dot(Date.now() + Math.random(), parentColor, spawnX, spawnY);
                                dots.push(newDot);
                            }

                            d1.fertility = 0;
                            d2.fertility = 0;
                        }
                    }

                    d1.cooldown = 60;
                    d2.cooldown = 60;
                }
            }
        }
    }
    // 3. Hunter Interactions
    for (let i = 0; i < hunters.length; i++) {
        const hunter = hunters[i];
        if (hunter.markedForDeletion) continue;

        for (let j = 0; j < dots.length; j++) {
            const dot = dots[j];
            if (dot.markedForDeletion || !dot.isPredator) continue;

            const hCenterX = hunter.x + hunter.size / 2;
            const hCenterY = hunter.y + hunter.size / 2;
            const dCenterX = dot.x + dot.size / 2;
            const dCenterY = dot.y + dot.size / 2;

            const dist = Math.sqrt((hCenterX - dCenterX) ** 2 + (hCenterY - dCenterY) ** 2);

            if (dist < (hunter.size / 2 + dot.size / 2)) {
                dot.markedForDeletion = true;
                hunter.energy += 500; // Refill energy
            }
        }
    }
}

function spawnHunterIfNeeded() {
    const predatorCount = dots.filter(d => d.isPredator).length;
    const normalCount = dots.filter(d => !d.isPredator).length;

    // Condition: Predators > 5 AND > 1/3 of normal population
    if (config.enableHunters && predatorCount > 5 && predatorCount > normalCount / 3 && hunters.length === 0) {
        hunters.push(new Hunter(Math.random() * window.innerWidth, Math.random() * window.innerHeight));
    }
}

function clearGame() {
    dots.forEach(d => d.element.remove());
    hunters.forEach(h => h.element.remove());
    foods.forEach(f => f.element.remove());
    dots = [];
    hunters = [];
    foods = [];
    collisionCounter = 0;
    predatorCollisionCounter = 0;
    if (animationId) cancelAnimationFrame(animationId);
}

function start() {
    clearGame();

    // Initial dots
    for (let i = 0; i < initialDotCount; i++) {
        dots.push(new Dot(i, colors[i % colors.length]));
    }

    // Initial Food
    for (let i = 0; i < config.initialFood; i++) {
        foods.push(new Food());
    }

    animate();
}

function restartGame() {
    start();
}

function animate() {
    dots = dots.filter(dot => {
        if (dot.markedForDeletion) {
            if (dot.element.parentNode) dot.element.parentNode.removeChild(dot.element);
            return false;
        }
        return true;
    });

    foods = foods.filter(food => !food.markedForDeletion);

    dots.forEach(dot => dot.update());
    hunters.forEach(hunter => hunter.update());

    // Clean up hunters
    hunters = hunters.filter(h => {
        if (h.markedForDeletion) {
            h.element.remove();
            return false;
        }
        return true;
    });

    checkCollisions();
    spawnHunterIfNeeded();
    animationId = requestAnimationFrame(animate);
}

window.addEventListener('resize', () => { });

// Initialize UI
rateInput.value = config.predatorRate;
rateDisplay.innerText = config.predatorRate; // Added this line to update the display span
foodInput.value = config.initialFood;
habitatCheck.checked = config.enableHabitats;
hunterCheck.checked = config.enableHunters;
fightRateInput.value = config.fightRate;

start();
