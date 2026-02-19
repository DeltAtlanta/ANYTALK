(function () {
  var container = document.getElementById('particles-container');
  if (!container) return;
  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var particles = [];
  var count = 50;

  function resize() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }

  function create() {
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
      });
    }
  }

  function draw() {
    if (!ctx || !canvas.width) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(92, 83, 73, 0.12)';
    particles.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  create();
  draw();
})();
