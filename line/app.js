import React, {Component} from 'react';
import {render} from 'react-dom';

import {StaticMap} from 'react-map-gl';
import DeckGL, {LineLayer, ScatterplotLayer, ArcLayer} from 'deck.gl';
import {GeoJsonLayer} from '@deck.gl/layers';
import GL from '@luma.gl/constants';
//import projData from 'US_funding_data.json';

//var projData = require('./US_funding_data.json')
var projData = require('./Gates_funding_data.json')
var countryData = require('./countries.json')
// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line


// Source data CSV
//const DATA_URL = {
//  AIRPORTS:
//    'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/line/airports.json', // eslint-disable-line
//  FLIGHT_PATHS:
//    'https://raw.githubusercontent.com/uber-common/deck.gl-data/master/examples/line/heathrow-flights.json' // eslint-disable-line
//};

export const INITIAL_VIEW_STATE = {
  latitude: 15,
  longitude: 0,
  zoom: 2,
  maxZoom: 16,
  minZoom: 2,
  pitch: 50,
  bearing: 0
};

function getColor(d) {
  const z = d.outbound;
  const r = z / 350499850.5;

  return [255 * (r), 128 * r, 255 * r, 255 * (1 - r)];
}

function getSize(type) {
  if (type.search('major') >= 0) {
    return 100;
  }
  if (type.search('small') >= 0) {
    return 30;
  }
  return 60;
}

function randExtent(coord, len) {
  var percent = ((Math.floor(Math.random() * 100) + 1) / 100)
  var amount = percent * len

  //console.log(amount)

  if (Math.round(Math.random()) === 0) {
    return coord + (amount / 2)
  } else {
    return coord - (amount / 2)
  }
}

function getPosition(coords, extent) {
  var lon = randExtent(coords[0], extent[0])
  var lat = randExtent(coords[1], extent[1])

  return [lon, lat]
}

export class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hoveredObject: null,
      selectedCountry: null
    };
    this._onHover = this._onHover.bind(this);
    this._onClick = this._onClick.bind(this);
    this._renderTooltip = this._renderTooltip.bind(this);
    this._onSelectCountry = this._onSelectCountry.bind(this);
  }

  _onHover({x, y, object}) {
    this.setState({x, y, hoveredObject: object});
  }

  _onClick({x, y, object}) {
    console.log(object.id);
    this.setState({x, y, selectedCounty: object.id});
  }

  _onSelectCountry({object}) {
    this._recalculateArcs(this.props.data, object);
  }

  _renderTooltip() {
    const {x, y, hoveredObject} = this.state;
    return (
      hoveredObject && (
        <div className="tooltip" style={{left: x, top: y}}>
          <div>{hoveredObject.country || hoveredObject.abbrev}</div>
          <div>{hoveredObject.name.indexOf('0x') >= 0 ? '' : hoveredObject.name}</div>
        </div>
      )
    );
  }

  _recalculateArcs(data, selectedCountry = this.state.selectedCountry) {
    if (!data) {
      return;
    }

    if (typeof selectedCountry === 'undefined') {
      selectedCountry = data.find(f => f.properties.name === 'USA');
    }

    const {flows, centroid} = selectedCountry.properties;

    const arcs = Object.keys(flows).map(toId => {
      const f = data[toId];
      return {
        source: centroid,
        target: f.properties.centroid,
        value: flows[toId]
      };
    });

    //const scale = scaleQuantile()
    //  .domain(arcs.map(a => Math.abs(a.value)))
    //  .range(inFlowColors.map((c, i) => i));

    //arcs.forEach(a => {
    //  a.gain = Math.sign(a.value);
    //  a.quantile = scale(Math.abs(a.value));
    //});

    this.setState({arcs});
  }

  _renderLayers() {
    const {
    //  airports = DATA_URL.AIRPORTS,
    //  flightPaths = DATA_URL.FLIGHT_PATHS,
      getStrokeWidth = 3
    } = this.props;

    return [
      //new ScatterplotLayer({
      //  id: 'airports',
      //  data: airports,
      //  radiusScale: 20,
      //  getPosition: d => d.coordinates,
      //  getFillColor: [255, 140, 0],
      //  getRadius: d => getSize(d.type),
      //  pickable: true,
      //  onHover: this._onHover
      //}),
      new GeoJsonLayer({
        id: 'geojson-layer',
        data: countryData,
        pickable: true,
        stroked: false,
        filled: true,
        extruded: true,
        lineWidthScale: 20,
        lineWidthMinPixels: 2,
        getFillColor: [0, 0, 0, 0],
        getRadius: 100,
        getLineWidth: 1,
        getElevation: 30,
        onClick: this._onClick
      }),

      new ArcLayer({
        id: 'usProjects',
        data: projData,
        //data: flightPaths,
        fp64: false,
        //getSourcePosition: d => getPosition(d.from.coordinates, d.from.extent),
        getSourcePosition: d => d.from.coordinates,
        getTargetPosition: d => getPosition(d.to.coordinates, d.to.extent),
        getSourceColor: d => [40, Math.sqrt(d.outbound) + 40, 40],
        getTargetColor: d => [Math.sqrt(d.outbound), 0, Math.sqrt(d.outbound)],
        getStrokeWidth: d => (d.outbound / 350499850.5) * 10,
        pickable: true,
        onHover: this._onHover
      })
    ];
  }

  render() {
    const {viewState, controller = true, baseMap = true} = this.props;

    return (
      <DeckGL
        layers={this._renderLayers()}
        initialViewState={INITIAL_VIEW_STATE}
        viewState={viewState}
        controller={controller}
        pickingRadius={5}
        parameters={{
          blendFunc: [GL.SRC_ALPHA, GL.ONE, GL.ONE_MINUS_DST_ALPHA, GL.ONE],
          blendEquation: GL.FUNC_ADD
        }}
      >
        {baseMap && (
          <StaticMap
            reuseMaps
            mapStyle="mapbox://styles/mapbox/dark-v9"
            preventStyleDiffing={true}
            mapboxApiAccessToken={MAPBOX_TOKEN}
          />
        )}

        {this._renderTooltip}
      </DeckGL>
    );
  }
}

export function renderToDOM(container) {
  render(<App />, container);
}
