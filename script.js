'use strict';

import { v4 as uuidv4 } from './node_modules/uuid/dist/esm-browser/index.js';

const openCageApiKey = 'a79cbdc4169f44c097ce8dbfed331ce1';
const weatherApiKey = 'b76ccdaae0f847c4a19102257231304';

class Workout {
  id = uuidv4();

  constructor(
    coords,
    distance,
    duration,
    location,
    date,
    temperature,
    condition,
    iconUrl,
    shapeCoords
  ) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
    this.location = location;
    this.date = date;
    this.temperature = temperature;
    this.condition = condition;
    this.iconUrl = iconUrl;
    this.shapeCoords = shapeCoords;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} in ${this.location}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(
    coords,
    distance,
    duration,
    cadence,
    location,
    date,
    temperature,
    condition,
    iconUrl,
    shapeCoords
  ) {
    super(
      coords,
      distance,
      duration,
      location,
      date,
      temperature,
      condition,
      iconUrl,
      shapeCoords
    );
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(
    coords,
    distance,
    duration,
    elevationGain,
    location,
    date,
    temperature,
    condition,
    iconUrl,
    shapeCoords
  ) {
    super(
      coords,
      distance,
      duration,
      location,
      date,
      temperature,
      condition,
      iconUrl,
      shapeCoords
    );
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const showWorkoutsBttn = document.getElementById('show-all-workouts');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = new Map();
  #workoutShapesLayer;
  #drawnShapeCoords;
  #isNew;
  #currentEditableWorkout;

  constructor() {
    this.#isNew = true;
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // let modify buttons do their job
    this._modifyButtons();

    // Attach event handlers
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (this.#isNew) {
        this._newWorkout(e);
      } else if (!this.#isNew) {
        this._modifyWorkout(e, this.#currentEditableWorkout);
        this.#isNew = true;
      }
    });

    inputType.addEventListener('change', this._toggleElevationFieldAddRequired);
    containerWorkouts.addEventListener('click', e => {
      this._handleDeleteButtons(e);
      this._moveToPopup(e);
    });
    showWorkoutsBttn.addEventListener('click', this.showAllWorkouts.bind(this));

    // Initiate deleteAll button and filter dropdown box
    this._deleteAllFilter();
  }

  _loadMap(position) {
    const coords = [position.coords.latitude, position.coords.longitude];

    this._initializeMap(coords);
    this._addDrawingControl();
    this._renderAllWorkoutMarkers();

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#map.on('draw:created', e => {
      const { layerType, layer } = e;
      if (layerType === 'polyline') {
        this._handleDrawCreatedEvent(layer);
      }
    });
  }

  _initializeMap(coords) {
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#workoutShapesLayer = L.featureGroup().addTo(this.#map);
  }

  _renderAllWorkoutMarkers() {
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _renderWorkoutMarker(workout) {
    const markerOptions = {
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    };

    const markerContent = `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
      workout.description
    }`;

    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(L.popup(markerOptions))
      .setPopupContent(markerContent)
      .openPopup();

    this.#markers.set(workout.id, marker);

    const randomColor = `#` + Math.floor(Math.random() * 16777215).toString(16);

    // Render shape if it exists
    if (workout.shapeCoords) {
      const shape = new L.Polyline(workout.shapeCoords, { color: randomColor });
      shape.addTo(this.#map);
    }
  }

  _addDrawingControl() {
    // Add drawing control to the map
    const drawControl = new L.Control.Draw({
      draw: {
        polyline: true,
        polygon: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: false,
      },
      edit: false,
    });
    this.#map.addControl(drawControl);
  }

  _renderAllWorkouts(workouts) {
    if (Array.isArray(workouts)) {
      const workoutCards = document.querySelectorAll('.workout');
      workoutCards.forEach(card => card.remove());
      workouts.forEach(workout => this._renderWorkout(workout));
    } else this._renderWorkout(workouts);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  async _newWorkout(e) {
    e.preventDefault();

    if (this.#isNew) {
      const workout = await this._createWorkoutFromFormData();

      // Add new object to workout array
      this.#workouts.push(workout);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderAllWorkouts(workout);

      // Hide form + clear input fields
      this._hideForm();

      // reload and set localStorage to all workouts
      this._setLocalStorage();

      // let modify buttons do their job
      this._modifyButtons();

      // clear the stored shape coordinates
      this.#drawnShapeCoords = null;

      if (!document.querySelector('.container')) {
        this._deleteAllFilter();
      }
    }
  }

  async _createWorkoutFromFormData() {
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    const location = await this.getGeocode(lat, lng);
    const date = new Date();
    const weatherData = await this.fetchWeatherData(lat, lng, Date.now());
    const temperature = weatherData[0];
    const conditions = weatherData[1];
    const iconUrl = weatherData[2];
    const coords = [lat, lng];

    if (type === 'running') {
      const cadence = +inputCadence.value;
      return new Running(
        coords,
        distance,
        duration,
        cadence,
        location,
        date,
        temperature,
        conditions,
        iconUrl,
        this.#drawnShapeCoords
      );
    } else if (type === 'cycling') {
      const elevation = +inputElevation.value;
      return new Cycling(
        coords,
        distance,
        duration,
        elevation,
        location,
        date,
        temperature,
        conditions,
        iconUrl,
        this.#drawnShapeCoords
      );
    }

    throw new Error('Invalid workout type');
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <button class="modify styled button button-styled" id="${
      workout.id
    }" type="button">Modify</button>
    <button class="delete styled button button-styled" data-workout-id="${
      workout.id
    }" type="button">Delete</button>
    <div class="weather-container"><img class="weather-img" src=${
      workout.iconUrl
    } /><h3 class="weather_info">${workout.temperature} ℃, ${
      workout.condition
    }</h3> </div>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _handleDeleteButtons(e) {
    const deleteBtn = e.target.closest('.delete');
    if (!deleteBtn) return;

    const workoutEl = deleteBtn.closest('.workout');
    const workoutId = workoutEl.dataset.id;

    let deleteIndex = -1;
    let deletableWorkout = null;

    this.#workouts.forEach((workout, index) => {
      if (workout.id === workoutId) {
        deleteIndex = index;
        deletableWorkout = workout;
      }
    });

    if (deleteIndex !== -1 && deletableWorkout !== null) {
      this._removeWorkoutMarker(deletableWorkout);
      this._deleteElementAtIndex(deleteIndex, workoutEl);
    }
  }

  _deleteElementAtIndex(index, workoutEl) {
    // Remove the workout element from the DOM
    workoutEl.remove();

    // Remove the workout from the workouts array if the index is valid
    if (index !== -1) {
      this.#workouts.splice(index, 1);
    }

    this._setLocalStorage();

    // If there are no workouts left, remove the container DOM element and reload the map
    if (this.#workouts.length === 0) {
      const container = document.querySelector('.container');
      if (container) container.remove();
    }
    this.#map.remove();
    this._getPosition();
  }

  _removeWorkoutMarker(workout) {
    if (!workout) {
      console.warn('Undefined workout passed to _removeWorkoutMarker');
      return;
    }
    const marker = this.#markers.get(workout.id);
    if (marker) {
      marker.remove();
      this.#markers.delete(workout.id);
    }
  }

  _deleteAllFilter() {
    if (this.#workouts.length !== 0) {
      const html = `
    <div class="container">
      <form>
        filter by:
        <select class="drop_down" name="filter" id="filter">
          <option value="distance">distance</option>
          <option value="duration">duration</option>
          <option value="type">type</option>
          <option value="date">date</option>
        </select>
        <br><br>
      </form>
      <button class="delete_all button-styled">Delete All</button>
    </div>
    `;

      form.insertAdjacentHTML('beforebegin', html);

      const deleteAllBtn = document.querySelector('.delete_all');
      const filter = document.querySelector('.drop_down');
      const selectedValue = localStorage.getItem('selectedValue');

      deleteAllBtn.addEventListener('click', this.reset.bind(this));

      filter.addEventListener('change', () => {
        const selectedIndex = filter.selectedIndex;
        localStorage.setItem('selectedValue', filter.value);
        this._filterWorkouts(selectedIndex);
      });

      if (selectedValue) {
        filter.value = selectedValue;
      }
    }
  }

  _filterWorkouts(index) {
    this.#workouts.sort((a, b) => {
      switch (index) {
        case 0:
          return a.distance - b.distance;
        case 1:
          return a.duration - b.duration;
        case 2:
          return b.type.localeCompare(a.type);
        case 3:
          return a.date - b.date;
        default:
          return 0;
      }
    });

    this._renderAllWorkouts(this.#workouts);
    this._setLocalStorage();
  }

  _modifyButtons() {
    const modifyButtons = document.querySelectorAll('.modify');

    const handleClick = event => {
      form.classList.remove('hidden');
      inputDistance.focus();
      this.#isNew = false;
      this.#currentEditableWorkout = event.target.id;
    };

    modifyButtons.forEach(button =>
      button.addEventListener('click', handleClick)
    );
    this.#isNew = true;
  }

  _replaceElementAtIndex(index, newValue) {
    this.#workouts[index] = newValue;
    this._renderAllWorkouts(this.#workouts);
  }

  _modifyWorkout(e, workoutId) {
    e.preventDefault();

    const workoutIndex = this.#workouts.findIndex(
      workout => workout.id === workoutId
    );
    const existingWorkout = this.#workouts[workoutIndex];

    const newWorkout = this._createWorkoutFromExistingData(existingWorkout);
    if (!newWorkout) return alert('Inputs have to be positive numbers!');

    this._replaceElementAtIndex(workoutIndex, newWorkout);
    this._hideForm();
    this._setLocalStorage();
  }

  _createWorkoutFromExistingData(existingWorkout) {
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return null;

      return new Running(
        existingWorkout.coords,
        distance,
        duration,
        cadence,
        existingWorkout.location,
        existingWorkout.date,
        existingWorkout.temperature,
        existingWorkout.condition,
        existingWorkout.iconUrl,
        existingWorkout.shapeCoords
      );
    } else if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return null;

      return new Cycling(
        existingWorkout.coords,
        distance,
        duration,
        elevation,
        existingWorkout.location,
        existingWorkout.date,
        existingWorkout.temperature,
        existingWorkout.condition,
        existingWorkout.iconUrl,
        existingWorkout.shapeCoords
      );
    }

    throw new Error('Invalid workout type');
  }

  _handleDrawCreatedEvent(layer) {
    this.#drawnShapeCoords = layer.getLatLngs();

    const latlngs = layer.getLatLngs();
    const distance = this._calculatePolylineDistance(latlngs);

    inputDistance.value = distance.toFixed(2);
    inputDuration.focus();
  }

  _calculatePolylineDistance(latlngs) {
    let distance = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
      distance += latlngs[i].distanceTo(latlngs[i + 1]);
    }
    return distance / 1000;
  }

  _toggleElevationFieldAddRequired() {
    const isRunning = inputType.value === 'running';

    if (isRunning) {
      inputElevation.removeAttribute('required');
      inputCadence.setAttribute('required', '');
    } else {
      inputElevation.setAttribute('required', '');
      inputCadence.removeAttribute('required');
    }

    inputElevation
      .closest('.form__row')
      .classList[isRunning ? 'add' : 'remove']('form__row--hidden');
    inputCadence
      .closest('.form__row')
      .classList[isRunning ? 'remove' : 'add']('form__row--hidden');
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workoutId = workoutEl.dataset.id;
    const workout = this.#workouts.find(work => work.id === workoutId);
    if (!workout) return;

    const mapOptions = {
      animate: true,
      pan: {
        duration: 1,
      },
    };

    this.#map.setView(workout.coords, this.#mapZoomLevel, mapOptions);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data.map(element => {
      const {
        coords,
        distance,
        duration,
        location,
        date,
        temperature,
        condition,
        iconUrl,
        shapeCoords,
      } = element;

      const convertedDate = new Date(date); // Convert the date string to a Date object

      if (element.type === 'running') {
        const { cadence } = element;
        return new Running(
          coords,
          distance,
          duration,
          cadence,
          location,
          convertedDate,
          temperature,
          condition,
          iconUrl,
          shapeCoords
        );
      } else {
        const { elevationGain } = element;
        return new Cycling(
          coords,
          distance,
          duration,
          elevationGain,
          location,
          convertedDate,
          temperature,
          condition,
          iconUrl,
          shapeCoords
        );
      }
    });

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  showAllWorkouts() {
    const coordinates = this.#workouts.map(workout => workout.coords);

    if (this.#workouts.length > 0) {
      const group = new L.featureGroup(coordinates.map(loc => L.marker(loc)));
      this.#map.fitBounds(group.getBounds());
    }
  }

  async getGeocode(latitude, longitude) {
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?key=${openCageApiKey}&q=${latitude}+${longitude}`
      );

      if (!response.ok) {
        throw new Error(`Error fetching geocode: ${response.status}`);
      }

      const data = await response.json();
      const locationComponents = data.results[0].components;

      const locality =
        locationComponents.city ||
        locationComponents.town ||
        locationComponents.village ||
        locationComponents.neighbourhood ||
        locationComponents.suburb ||
        locationComponents.city_district;

      const country = locationComponents.country;
      const location = locality ? `${locality}, ${country}` : country;

      return location;
    } catch (error) {
      console.error(error.message);
    }
  }

  async fetchWeatherData(lat, lon, time) {
    try {
      const date = new Date(time);
      const formattedDate = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      const url = `https://api.weatherapi.com/v1/history.json?key=${weatherApiKey}&q=${lat},${lon}&dt=${formattedDate}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error fetching weather data: ${response.status}`);
      }

      const data = await response.json();
      const avgTemp = data.forecast.forecastday[0].day.avgtemp_c;
      const weatherDescription =
        data.forecast.forecastday[0].day.condition.text;
      const iconUrl =
        'https:' + data.forecast.forecastday[0].day.condition.icon;

      return [avgTemp, weatherDescription, iconUrl];
    } catch (error) {
      console.error(error.message);
    }
  }

  reset() {
    this.#map.invalidateSize();

    document.querySelectorAll('.workout').forEach(workout => workout.remove());

    this.#workouts.forEach(workout => {
      this._removeWorkoutMarker(workout);
      if (workout.shape) {
        this.#map.removeLayer(workout.shape);
      }
    });

    this.#workouts = [];

    this._setLocalStorage();

    const container = document.querySelector('.container');
    container.remove();
    this.#map.remove();

    this._getPosition();
  }
}

const app = new App();
