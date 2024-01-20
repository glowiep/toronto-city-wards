$(() => {
  let latitude = 43.72;
  let longitude = -79.39;

  // Set up leaflet Map object
  const map = L.map('map').setView([latitude, longitude], 10);

  // Add openstreetmap tile layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    minZoom: 2,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>.',
    crossOrigin: true
  }).addTo(map);

  // Will bounce back when scrolling off the map
  map.setMaxBounds([[-90,-180], [90,180]]);

  // Add zoom control with your options
  map.zoomControl.setPosition('topleft');

  // Add scale bar
  L.control.scale().addTo(map);

  // create the geocoding control and add it to the map
  const searchControl = L.esri.Geocoding.geosearch({
    useMapBounds: false,
    expanded: true,
    zoomToResult: true,
    position: 'topleft',
    collapseAfterResult: true,
    placeholder: 'Search Address to Find City Ward'
  }).addTo(map);

  // Empty layer group to store results
  let results = L.layerGroup().addTo(map);


  // Listen for the results event and add every result to the map
  searchControl.on("results", function(data) {
    results.clearLayers();
    map.closePopup();
    geojson.resetStyle();
    for (let i = data.results.length - 1; i >= 0; i--) {
      const text = data.results[i].properties.Match_addr;
      const address = data.results[i].properties.Place_addr;
      console.log(data.results)
      longitude = data.results[i].properties.DisplayX;
      latitude = data.results[i].properties.DisplayY;
      isMarkerInsidePolygon()

      if (determinedCityWard) {  // If the marker is within a city ward boundary
        markers = L.marker([latitude, longitude]).addTo(results)
          .bindPopup(`<b>${determinedCityWard}</b> <br>${text} <br>${address}`, { autoClose: false })
          .openPopup();
      } else {
        markers = L.marker([latitude, longitude]).addTo(results)
          .bindPopup(`<b>${text}</b> <br>${address}`, { autoClose: false })
          .openPopup();
      }
    }
  });
  

  // Initialize lastClickedPoly layer
  let lastClickedPoly = null;

  /**
   * Highlight feature on map when clicked.
   * @param { event } e
   */
  const highlightFeature = function(e) {
    results.clearLayers();
    const layer = e.target;

    layer.setStyle({
      weight: 5,
      color: '#2DFDFF',
      fillOpacity: 0.25
    });

    layer.bringToFront();

    if (lastClickedPoly && lastClickedPoly.feature.properties.AREA_NAME != layer.feature.properties.AREA_NAME) {
      geojson.resetStyle(lastClickedPoly);
    }

    lastClickedPoly = layer;
  };
  

  /**
   * Determines if a point falls within a city ward polygon.
   * Sets the city ward found for the point as determinedCityWard.
   * @returns {string} This function returns the determinedCityWard for the point.
   */
  const isMarkerInsidePolygon = function() {
    // Creates a Point Feature from a Position.
    const pt = turf.point([longitude, latitude]);
    cityWardsData.features.forEach(currentCityWardPoly => {
      // multiPolygon - Creates a Feature based on a coordinate array
      poly = turf.multiPolygon(currentCityWardPoly.geometry.coordinates);

      // Takes a Point and a Polygon or MultiPolygon and determines if the point resides inside the polygon.
      const found = turf.booleanPointInPolygon(pt, poly);
      
      if (found) {
        return determinedCityWard = `Ward ${currentCityWardPoly.properties.AREA_SHORT_CODE}: ${currentCityWardPoly.properties.AREA_NAME}`;
      } 
    });
  };
  isMarkerInsidePolygon();


  /**
   * The onEachFeature option is a function that gets called on each feature before adding it to a GeoJSON layer.
   * A common reason to use this option is to attach a popup to features when they are clicked.
   * @param {Polygon} feature
   * @param {} layer
   */
  const onEachFeature = function(feature, layer) {
    layer.on({
      click: highlightFeature
    });
    if (feature.properties) {
      layer.bindPopup(`<b>Ward ${feature.properties.AREA_SHORT_CODE}</b>` + `<br>${feature.properties.AREA_NAME}` );
    }
  };

  // Add the GeoJSON features to the map
  let geojson = L.geoJson(cityWardsData.features, {
    onEachFeature: onEachFeature
  }).addTo(map);

  // Reset Map Button - Clear selected features on map
  $("#clearAllButton").on("click", function() {
    results.clearLayers();
    map.closePopup();
    geojson.resetStyle();
    map.setView([0, 0], 2);
    map.fitBounds(bounds);
  });

  // Focus map on city wards feature upon refresh
  const bounds = geojson.getBounds();
  map.fitBounds(bounds);
})