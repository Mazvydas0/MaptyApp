# Mapty

Mapty is a web application that allows users to track their running and cycling workouts on an interactive map. Users can add workouts with details like distance, duration, and other workout-specific metrics. The app also fetches weather data and location information for the time and place of the workout, providing users with a comprehensive overview of their exercise routines.

# Features
- Interactive map to visualize and add workouts
- Supports running and cycling workouts
- Fetches location and weather data for the time and place of the workout
- Stores workout data in local storage for persistence across sessions
- Responsive design for use on both desktop and mobile devices
# Technologies Used
- JavaScript (ES6+)
- HTML5 & CSS3
- Leaflet.js for map rendering and interactivity
- OpenCage Geocoding API for location information
- WeatherAPI for fetching historical weather data
# Getting Started
1. Clone the repository:
bash
Copy code
```bash
git clone https://github.com/Mazvydas0/MaptyApp.git
```
2. Change to the project directory:
```bash
cd mapty
```
3. Open the `index.html` file in your browser.

4. You're ready to use Mapty!

# Usage
- Allow the app to access your current location.
- Click on the map to add a workout marker at the desired location. Or click on the polyline icon, next to the zoom tools, to draw workout's polyline and then press the "finish" button.
- Fill in the workout details in the form that appears.
- Press "Enter" to save the workout and display it on the map.
- To move to the workout in the map, press on it's information in the workout's list on the left.
- To edit or delete the workout, press the respective buttons in workout's card on the left.
- To filter all workouts, or delete them at once, use the drop-box "filter by" menu or "Delete All" button, at the top left of the page.
- To see all workouts in the map, press the "Show all workouts" button at the middle bottom of the page.

# License
This project is licensed under the MIT License. See the LICENSE file for details.
