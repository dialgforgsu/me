'use strict';

// Coaching session cost calculator
(function () {
  var sessionType = 'inperson';
  var rates = { inperson: 10, virtual: 5 };

  var toggleBtns = document.querySelectorAll('.co-calc__toggle-btn');
  var peopleRange = document.getElementById('calc-people');
  var hoursRange = document.getElementById('calc-hours');
  var peopleDisplay = document.getElementById('calc-people-display');
  var hoursDisplay = document.getElementById('calc-hours-display');
  var totalEl = document.getElementById('calc-total');
  var breakdownEl = document.getElementById('calc-breakdown');

  function formatHours(h) {
    return h === 1 ? '1 hour' : h % 1 === 0 ? h + ' hours' : h + ' hours';
  }

  function update() {
    var people = parseInt(peopleRange.value, 10);
    var hours = parseFloat(hoursRange.value);
    var rate = rates[sessionType];
    var total = rate * people * hours;

    peopleDisplay.innerHTML = people + ' <span>people</span>';
    hoursDisplay.innerHTML = hours + ' <span>' + (hours === 1 ? 'hour' : 'hours') + '</span>';

    totalEl.textContent = '$' + total.toLocaleString('en-US', { maximumFractionDigits: 0 });

    var label = sessionType === 'inperson' ? 'In person' : 'Virtual';
    breakdownEl.innerHTML =
      '<strong>' +
      label +
      '</strong> &bull; ' +
      people +
      ' people &bull; ' +
      formatHours(hours) +
      '<br>' +
      '$' +
      rate +
      ' &times; ' +
      people +
      ' people &times; ' +
      hours +
      ' hr = $' +
      total.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      toggleBtns.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      sessionType = btn.dataset.type;
      update();
    });
  });

  peopleRange.addEventListener('input', update);
  hoursRange.addEventListener('input', update);

  update();
})();
