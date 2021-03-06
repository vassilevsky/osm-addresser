(function() {
  var FETCH_RADIUS, LOCATION_CHECK_INTERVAL, LOCATION_WAITING_TIMEOUT, MAX_ACCEPTABLE_ACCURACY, MAX_ZOOM, NOTES_URL, OVERPASS_URL, addBuildings, checkLocation, currentLocation, displayError, fetchBuildingsAroundLocation, format, getAnswers, levels_word, map, onLocationError, onLocationFound, postNote, tagBuilding;

  LOCATION_CHECK_INTERVAL = 1000 * 60;

  LOCATION_WAITING_TIMEOUT = 1000 * 45;

  MAX_ACCEPTABLE_ACCURACY = 500;

  MAX_ZOOM = 16;

  FETCH_RADIUS = 1000;

  OVERPASS_URL = 'http://overpass.openstreetmap.fr/api/interpreter';

  NOTES_URL = 'http://api.openstreetmap.org/api/0.6/notes';

  currentLocation = new L.LatLng(0, 0);

  checkLocation = function() {
    setTimeout(checkLocation, LOCATION_CHECK_INTERVAL);
    return map.locate({
      enableHighAccuracy: true,
      setView: true,
      maxZoom: MAX_ZOOM,
      timeout: LOCATION_WAITING_TIMEOUT
    });
  };

  onLocationError = function(error) {
    return alert("Error " + error.code + ": " + error.message + " :(");
  };

  onLocationFound = function(location) {
    if (location.accuracy <= MAX_ACCEPTABLE_ACCURACY && location.latlng.distanceTo(currentLocation) > FETCH_RADIUS) {
      fetchBuildingsAroundLocation(location);
    }
    return currentLocation = location.latlng;
  };

  fetchBuildingsAroundLocation = function(location) {
    var q;
    q = "[out:json]; way(around:" + FETCH_RADIUS + ".0," + location.latitude + "," + location.longitude + ")[building]; (._; - way._['addr:housenumber'];); (._;>;); out;";
    return $.post(OVERPASS_URL, {
      data: q
    }, addBuildings);
  };

  addBuildings = function(overpassResponse) {
    var building, building_polygon, corners, elements, i, j, k, len, len1, len2, node, node_id, ref;
    elements = overpassResponse.elements;
    for (i = 0, len = elements.length; i < len; i++) {
      building = elements[i];
      if (!(building.type === 'way')) {
        continue;
      }
      corners = [];
      ref = building.nodes;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        node_id = ref[j];
        for (k = 0, len2 = elements.length; k < len2; k++) {
          node = elements[k];
          if (node.id === node_id) {
            corners.push([node.lat, node.lon]);
            break;
          }
        }
      }
      building_polygon = new L.Polygon(corners, {
        color: 'red'
      });
      building_polygon.on('click', tagBuilding);
      map.addLayer(building_polygon);
    }
  };

  displayError = function(message) {
    return alert(message);
  };

  tagBuilding = function() {
    var answers, center, text;
    this.setStyle({
      color: 'orange'
    });
    answers = getAnswers({
      number: 'Номер дома',
      street: 'Улица',
      levels: 'Количество этажей',
      comment: 'Комментарий'
    });
    if (answers) {
      center = this.getBounds().getCenter();
      text = format(answers);
      return postNote(center.lat, center.lng, text, (function(_this) {
        return function() {
          return _this.setStyle({
            color: 'green'
          });
        };
      })(this));
    }
  };

  format = function(answers) {
    var address, pieces;
    pieces = [];
    if (answers.street) {
      pieces.push(answers.street);
    }
    if (answers.number) {
      pieces.push("дом № " + answers.number);
    }
    if (answers.levels) {
      pieces.push(answers.levels + " " + (levels_word(answers.levels)));
    }
    address = pieces.join(', ');
    if (answers.comment) {
      if (address.length > 0) {
        address += " (" + answers.comment + ")";
      } else {
        address = answers.comment;
      }
    }
    return address;
  };

  levels_word = function(n) {
    n %= 100;
    if (n >= 5 && n <= 20) {
      return 'этажей';
    }
    n %= 10;
    if (n === 1) {
      return 'этаж';
    }
    if (n >= 2 && n <= 4) {
      return 'этажа';
    }
    return 'этажей';
  };

  getAnswers = function(questions) {
    var answers, input, question, tagName, value;
    for (tagName in questions) {
      question = questions[tagName];
      input = prompt(question + " = ?");
      if (input == null) {
        return null;
      }
      value = input.trim();
      if (value.length) {
        if (typeof answers === "undefined" || answers === null) {
          answers = {};
        }
        answers[tagName] = value;
      }
    }
    return answers;
  };

  postNote = function(lat, lon, text, onNotePosted) {
    return $.post(NOTES_URL, {
      lat: lat,
      lon: lon,
      text: text
    }, onNotePosted);
  };

  L.mapbox.accessToken = 'pk.eyJ1IjoidmFzc2lsZXZza3kiLCJhIjoiSExMaHRpYyJ9.MrxjsWwHSrH_DfaRDNRYTw';

  map = L.mapbox.map('map', 'mapbox.streets');

  map.on('locationerror', onLocationError);

  map.on('locationfound', onLocationFound);

  $(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    return alert(thrownError);
  });

  checkLocation();

}).call(this);
