
const ctx = document.getElementById('meuGrafico');
const meuGrafico = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Produto A', 'Produto B', 'Produto C', 'Produto D', 'Produto E'],
      datasets: [{
        label: 'Vendas',
        data: [12500, 10000, 3000, 5000, 8000],
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: context => {
              return ' R$ ' + context.parsed.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
            }
          }
        },
        legend: {
          position: 'left',
          labels: {
            font: { size: 18 }
          },
        },
        title: {
          display: true,
          text: 'Total de Vendas por Produto',
          font: { size: 24 },
          padding: { bottom: 30 }
        }
      },
      responsive: false,
      maintainAspectRatio: true
    }
});