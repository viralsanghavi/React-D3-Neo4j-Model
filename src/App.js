import { mapToArray, promptAlert, setupNeo4jLoginForAjax, removeAlert } from './map.js'
import React from 'react'
import * as d3 from 'd3';
import $ from 'jquery';
import './App.css'
import { Button, Label, Input } from 'reactstrap'
import { RiSearchLine } from 'react-icons/ri';
import { FiFilter } from 'react-icons/fi';

class App extends React.Component {
  constructor(props) {
    super(props)
    this.text = {
      step1: " Claims where the location of the garage and the location of the person is different and declare the claims as suspect",
      step2: "Person and Garage related to the suspected claims(all the people having location both same and different to the garage)",
      step3: "Person and garage related to the suspected claims(all the people having location different to the garage)",
      step4: "All the people being common in accident and even as witness"
    }
    this.neo_queries = {
      q1: "Match q1= (p1:Person)-[]-(g1:Garage),q2= (g1)-[]-(c1:Claim) WHERE p1.Address <> g1.G_Location SET c1.type = 'suspect' RETURN q1,q2",
      q2: "Match q = (p1:Person)-[]-(g1:Garage), (g1)-[]-(c1:Claim)WHERE c1.type = 'suspect' RETURN q",
      q3: "Match q=(p1:Person)-[]-(g1:Garage),q2= (g1)-[]-(c1:Claim) WHERE c1.type = 'suspect'AND p1.Address <> g1.G_Location RETURN q2,q",
      q4: "Match q0=(p_1:Person)-[]-(g_1:Garage),q1= (g_1)-[]-(c1:Claim), (a1:Accident)<-[]-(v1:Vehicle)<-[r1]-(p1:Person), q2=(a2:Accident)<-[]-(v2:Vehicle)<-[r2]-(p2:Person),q3=(p3:Person)-[]->(v1)<-[]-(p4:Person) WHERE p1.Name = p2.Name AND c1.type = 'suspect' RETURN q0,q1,q2,q3"
    }
    this.state = {
      style: "menu",
      menuStatus: "open",
      styleFilter: "filter",
      filterStatus: "open"
    };
    this.createChart = this.createChart.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }

  handleClicked = () => {
    switch (this.state.filterStatus) {
      case "open":
        this.setState({
          filterStatus: "close",
          styleFilter: "filteractive active"
        });
        break;
      case "close":
        this.setState({
          filterStatus: "open",
          styleFilter: "filter"
        });
        break;
    }
  }
  handleClick() {
    switch (this.state.menuStatus) {
      case "open":
        this.setState({
          menuStatus: "close",
          style: "menu active"
        });
        break;
      case "close":
        this.setState({
          menuStatus: "open",
          style: "menu"
        });
        break;
    }
  }

  componentDidUpdate() {
    if (this.props.data.display === "dashboard") {
      this.createChart()
      // this.countLabel()
    }
  }
  // componentWillMount() {
  //   this.countLabel()
  
  // }


  countLabel = () => {
    var neo4jAPIURL = 'http://' + this.props.data.ip + ':' + this.props.data.port + '/db/data/transaction/commit/';
    var neo4jLogin = 'neo4j';
    var neo4jPassword = "12345";
    var queryStr = "MATCH (n) RETURN DISTINCT count(labels(n)), labels(n)"
    var jqxhr = $.post(neo4jAPIURL, '{"statements":[{"statement":"' + queryStr + '", "resultDataContents":["graph"]}]}',
      // var jqxhr = $.get(neo4jAPIURL,

      function (data) {
        console.log(data)
        if (data.errors !== null && data.errors.length > 0) {
          promptAlert($('#graphContainer'), 'Error: ' + data.errors[0].message + '(' + data.errors[0].code + ')', true);
          return;
        }
        // console.log('nodeItemMap.size:' + Object.keys(nodeItemMap).length);
        // console.log('linkItemMap.size:' + Object.keys(linkItemMap).length);


        //also update graph when empty
        console.log('No record found !', false);
      }, 'json');

    jqxhr.fail(function (data) {
      console.log('Error: submitted query text but got error return (' + data + ')', true);
    });
  }




  createChart() {
    var que = (this.neo_queries)
    var test = this.text
    //######################### const #########################
    var graphWidth = 1024;
    var graphHeight = 450;

    var neo4jAPIURL = 'http://' + this.props.data.ip + ':' + this.props.data.port + '/db/data/transaction/commit/';
    var neo4jLogin = 'neo4j';
    var neo4jPassword = this.props.data.password;
    // console.log(this.props.data);

    var circleSize = 30;
    var textPosOffsetY = 5;
    var arrowWidth = 5;
    var arrowHeight = 5;


    var collideForceSize = circleSize * 1.5;
    var linkForceSize = 150;
    //######################### variable #########################
    var nodeItemMap = {};
    var linkItemMap = {};


    var d3Simulation = null;
    var circles;
    var circleText;
    var lines;
    var lineText;
    var iconLock;
    var iconCross;

    var iconPosOffset = { 'lock': [-40, -50], 'cross': [18, -50] };

    var linkTypeMapping = { 'OUT_ADD': '+', 'OUT_SUB': '-', 'IN_AND': 'AND', 'IN_OR': 'OR' };

    var lockIconSVG = 'm18,8l-1,0l0,-2c0,-2.76 -3.28865,-5.03754 -5,-5c-1.71135,0.03754 -5.12064,0.07507 -5,4l1.9,0c0,-1.71 1.39,-2.1 3.1,-2.1c1.71,0 3.1,1.39 3.1,3.1l0,2l-9.1,0c-1.1,0 -2,0.9 -2,2l0,10c0,1.1 0.9,2 2,2l12,0c1.1,0 2,-0.9 2,-2l0,-10c0,-1.1 -0.9,-2 -2,-2zm0,12l-12,0l0,-10l12,0l0,10z';

    var crossIconSVG = 'M14.59 8L12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41 14.59 8zM12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z';

    var boxSVG = 'M0 0 L23 0 L23 23 L0 23 Z';

    var fullscreen = 'M16 16h-8v-8h8v8zm-10-7.172v-2.828h2.828l-3.414-3.414 2.586-2.586h-8v8l2.586-2.586 3.414 3.414zm2.828 9.172h-2.828v-2.828l-3.414 3.414-2.586-2.586v8h8l-2.586-2.586 3.414-3.414zm9.172-2.828v2.828h-2.828l3.414 3.414-2.586 2.586h8v-8l-2.586 2.586-3.414-3.414zm-2-15.172l2.586 2.586-3.414 3.414h2.828v2.828l3.414-3.414 2.586 2.586v-8h-8z'

    var reduce = 'M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6 13h-12v-2h12v2z'

    var increase = 'M24 10h-10v-10h-4v10h-10v4h10v10h4v-10h10z'

    var reSet = 'M2.458 9.012c-.297.947-.458 1.955-.458 3 0 5.52 4.481 10 10 10 5.52 0 10-4.48 10-10 0-5.519-4.48-10-10-10-2.121 0-4.083.668-5.703 1.796l1.703 2.204h-6.58l1.935-6.012 1.718 2.223c1.958-1.389 4.346-2.211 6.927-2.211 6.623 0 12 5.377 12 12s-5.377 11.988-12 11.988-12-5.365-12-11.988c0-1.036.132-2.041.379-3h2.079zm10.35-3.012c.292.821.375 1.346 1.01 1.609.637.264 1.073-.052 1.854-.423l1.142 1.142c-.373.787-.687 1.218-.423 1.854.262.634.784.716 1.609 1.009v1.617c-.816.29-1.347.375-1.61 1.01-.264.636.052 1.071.424 1.853l-1.142 1.142c-.79-.375-1.219-.687-1.85-.424-.639.265-.723.793-1.014 1.611h-1.616c-.292-.821-.375-1.347-1.01-1.61-.637-.264-1.072.052-1.854.423l-1.142-1.142c.366-.771.689-1.212.423-1.854-.263-.635-.793-.719-1.609-1.009v-1.617c.817-.29 1.346-.373 1.609-1.009.264-.637-.051-1.07-.423-1.854l1.142-1.142c.788.374 1.218.687 1.854.423.635-.263.719-.792 1.01-1.609h1.616zm-.808 8c-1.105 0-2-.896-2-2 0-1.105.895-2.001 2-2.001 1.104 0 2 .896 2 2.001 0 1.104-.896 2-2 2z'

    var drag_handler = d3.drag()
      .on('start', drag_start)
      .on('drag', drag_move)
      .on('end', drag_end);

    var itemColorMap = {};
    var colorScale = d3.scaleOrdinal(d3.schemeSet2);
    var zoom_handler = d3.zoom()
      .filter(function () {
        //Only enable wheel zoom and mousedown to pan
        return (d3.event.type === 'wheel' | d3.event.type === 'mousedown');
      })
      .on('zoom', zoom_actions);

    function unfreezeItms() {
      var nodeItmArray = d3Simulation.nodes();
      if (nodeItmArray !== null) {
        nodeItmArray.forEach(function (nodeItm) {
          if (nodeItm.fx !== null) {
            nodeItm.fx = null;
            nodeItm.fy = null;
          }
        });
      }
    }

    // create a tooltip
    var Tooltip = d3.select("#graphContainer")
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "2px")
      .style("border-radius", "5px")
      .style("padding", "15px")
      .style("height", "fit-content")
      .style("transition", "0.8s ease")
      .style("width", "fit-content");


    // Three function that change the tooltip when user hover / move / leave a cell

    function mouseover(d) {
      Tooltip

        .style("opacity", 1)
      d3.select(this)
        .style("stroke", "black")
        .style("opacity", 1)
    }
    var mousemove = function (d) {
      var label;
      if (d.labels != null)
        label = '<h5 id="inner-text">Label: ' + d.labels.join(', ') + '</h5> ';
      //For links
      if (d.type != null)
        label = ' Type: ' + d.type;

      var prop = "";

      $.map(d.properties, function (value, key) {
        prop += '<span id="under-text"> <strong>' + key + '</strong>: ' + value + '</span>';
      });

      Tooltip
        .html(label + prop)
        // .style("top",(mouseX - 100)+"px")
        // .style("left",(d3.mouse(this)[0] - 500) +"px")
        .style("left", (d3.mouse(this)[0] + 50) + "px")
        .style("top", (d3.mouse(this)[1] + 10) + "px")
    }
    var mouseleave = function (d) {
      Tooltip
        .style("opacity", 0)
      d3.select(this)
        .style("stroke", "none")
        .style("opacity", 0.8)
    }



    var elem = document.getElementById('graphContainer');
    function openFullscreen() {
      if (elem.requestFullscreen) {
        document.getElementById('resultSvg').style.width = '100%'
        document.getElementById('resultSvg').style.height = '100%'
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
      }
    }

    document.getElementById('btnFullscreen').addEventListener('click', function () {
      openFullscreen()
    });

    function drag_start(d) {
      d3Simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function drag_move(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function drag_end(d) {
      if (!d3.event.active && d3Simulation !== null)
        d3Simulation.alphaTarget(0);
    }

    function zoom_actions() {
      d3.select('#resultSvg').select('g').attr('transform', d3.event.transform);
    }

    function initGraph() {
      var svg = d3.select('#resultSvg');
      var zoomGLayer = svg.append('g');

      var centerX = graphWidth / 2;
      var centerY = graphHeight / 2;

      svg.attr('width', graphWidth)
        .attr('height', graphHeight)
        .attr("class", "svg");
      d3.select("#download").on("click", function () {
        console.log("click")
        d3.select(this)
          .attr("href", 'data:application/octet-stream;base64,' + btoa(d3.select("#resultSvg").html()))
          .attr("download", "viz.svg")
      })

      zoomGLayer.append('g').attr('id', 'circle-group').attr('transform', 'translate(' + centerX + ',' + centerY + ')');
      zoomGLayer.append('g').attr('id', 'text-group').attr('transform', 'translate(' + centerX + ',' + centerY + ')');
      zoomGLayer.append('g').attr('id', 'path-group').attr('transform', 'translate(' + centerX + ',' + centerY + ')');
      zoomGLayer.append('g').attr('id', 'path-label-group').attr('transform', 'translate(' + centerX + ',' + centerY + ')');
      zoomGLayer.append('g').attr('id', 'control-icon-group').attr('transform', 'translate(' + centerX + ',' + centerY + ')');

      zoom_handler(svg);
    }
    var svg = d3.select('#resultSvg');
    function reset() {
      console.log("reset")
      svg.transition().duration(750).call(
        zoom_handler.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([graphWidth / 2, graphHeight / 2])
      );
    }

    function zoomIn() { svg.transition().call(zoom_handler.scaleBy, 1.5) }
    function zoomOut() { svg.transition().call(zoom_handler.scaleBy, 0.5) }


    function stopSimulation() {
      if (d3Simulation !== null) {
        d3Simulation.stop()
          .on('tick', null);
        d3Simulation = null;
      }
    }

    function tick() {
      lines.attr('d', drawLine);
      lineText.attr('transform', transformPathLabel);
      circles.attr('transform', transform);
      circleText.attr('transform', transform);

      iconLock.attr('transform', function (d) { return transformIcon(d, 'lock'); });
      iconCross.attr('transform', function (d) { return transformIcon(d, 'cross'); });
    }

    function transformIcon(d, type) {
      var sourceX = d.x + iconPosOffset[type][0];
      var sourceY = d.y + iconPosOffset[type][1];
      return 'translate(' + sourceX + ',' + sourceY + ')';
    }

    function transformPathLabel(d) {
      var sourceX = d.source.x + ((d.target.x - d.source.x) / 2);
      var sourceY = d.source.y + ((d.target.y - d.source.y) / 2);
      return 'translate(' + sourceX + ',' + sourceY + ')';
    }

    function transform(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    }

    function drawLine(d) {
      var deltaX, deltaY, dist, cosTheta, sinTheta, sourceX, sourceY, targetX, targetY;

      deltaX = d.target.x - d.source.x;
      deltaY = d.target.y - d.source.y;
      dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      cosTheta = deltaX / dist;
      sinTheta = deltaY / dist;
      sourceX = d.source.x + (circleSize * cosTheta);
      sourceY = d.source.y + (circleSize * sinTheta);
      targetX = d.target.x - (circleSize * cosTheta);
      targetY = d.target.y - (circleSize * sinTheta);

      //Not use marker as IE does not support it and so embed the arrow in the path directly
      var arrowLeftX, arrowLeftY, arrowRightX, arrowRightY;

      arrowLeftX = targetX - (arrowHeight * sinTheta) - (arrowWidth * cosTheta);
      arrowLeftY = targetY + (arrowHeight * cosTheta) - (arrowWidth * sinTheta);
      arrowRightX = targetX + (arrowHeight * sinTheta) - (arrowWidth * cosTheta);
      arrowRightY = targetY - (arrowHeight * cosTheta) - (arrowWidth * sinTheta);

      return 'M' + sourceX + ' ' + sourceY + ' L' + targetX + ' ' + targetY
        + ' M' + targetX + ' ' + targetY + ' L' + arrowLeftX + ' ' + arrowLeftY
        + ' L' + arrowRightX + ' ' + arrowRightY + ' Z';
    }

    function clearProperties() {
      $('#propertiesBox').empty();
    }

    function showProperties(d) {
      clearProperties();

      var propertiesText = 'id: ' + d.id;
      //For nodes
      var label;

      if (d.labels != null)
        label = 'label: ' + d.labels.join(', ');
      //For links
      if (d.type != null)
        label = ' Type: ' + d.type;
      var prop = "";
      $.map(d.properties, function (value, key) {
        prop += ' ' + key + ': ' + value;
      });
      $('#propertiesBox').append($('<span id="inner-text"></span><br/>').text(propertiesText + " " + label));
      $('#propertiesBox').append($('<span id="inner-text"></span>').text(prop));
    }

    function replaceLinkTypeName(d) {
      var linkTypeName = linkTypeMapping[d.type];
      if (linkTypeName == null)
        return d.type;
      return linkTypeName;
    }

    function generateCircleClasses(d) {
      if (d.properties != null && d.properties.cyclic == '1')
        return 'Cyclic ' + d.labels.join(' ');
      return d.labels.join(' ');
    }

    function removeNode(d) {
      delete nodeItemMap[d.id];
      $.map(linkItemMap, function (value, key) {
        if (value.startNode === d.id || value.endNode === d.id)
          delete linkItemMap[key];
      });
    }

    function updateGraph() {
      var d3LinkForce = d3.forceLink()
        .distance(linkForceSize)
        .links(mapToArray(linkItemMap))
        .id(function (d) { return d.id; });

      d3Simulation = d3.forceSimulation()
        //.force('chargeForce', d3.forceManyBody())//.strength(-300)
        .force('collideForce', d3.forceCollide(collideForceSize))
        .nodes(mapToArray(nodeItemMap))
        .force('linkForce', d3LinkForce);

      circles = d3.select('#circle-group').selectAll('circle')
        .data(d3Simulation.nodes(), function (d) { return d.id; })
        .attr('fill', function (d) { return getColorBrighter(getItemColor(d)) });
      circleText = d3.select('#text-group').selectAll('text')
        .data(d3Simulation.nodes(), function (d) { return d.id; });
      lines = d3.select('#path-group').selectAll('path')
        .data(d3LinkForce.links(), function (d) { return d.id; });
      lineText = d3.select('#path-label-group').selectAll('text')

        .data(d3LinkForce.links(), function (d) { return d.id; });

      iconLock = d3.select('#control-icon-group').selectAll('g.lockIcon')
        .data([], function (d) { return d.id; });
      iconCross = d3.select('#control-icon-group').selectAll('g.crossIcon')
        .data([], function (d) { return d.id; });

      iconLock.exit().remove();
      iconCross.exit().remove();

      circles.exit().remove();
      circles = circles.enter().append('circle')
        .attr('r', circleSize)
        .attr('fill', getItemColor).attr('stroke', function (d) { return getColorDarker(getItemColor(d)); })
        // .attr('stroke', function (d) { return getColorDarker(getItemColor(d)); })
        .attr('title', function (d) { return d.labels.join('-'); })
        .attr('class', function (d) { return generateCircleClasses(d); })
        .call(drag_handler)
        .on('mouseover', function (d) {
          mouseover(d)
          showProperties(d)
        })
        // .on("mouseover", mouseover,)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
        .on('dblclick', function (d) {
          d.fx = d.x;
          d.fy = d.y;
          submitQuery(d.id);
        })
        .on('click', function (d) {

          // d3.select("h1").html(d.id);
          // d3.select("p").html(d.id);
          // d3.select("p").html("<a href='#' > " + d.id + " </a>");
          // append('path').attr('class', 'overlay').attr('d', boxSVG);

          iconLock = d3.select('#control-icon-group').selectAll('g.lockIcon')
            .data([d], function (d) { return d.id; });
          iconCross = d3.select('#control-icon-group').selectAll('g.crossIcon')
            .data([d], function (d) { return d.id; });

          iconLock.exit().remove();
          iconLock.remove();
          iconCross.exit().remove();
          iconCross.remove();

          var iconLockEnter = iconLock.enter().append('g')
            .attr('class', 'lockIcon')
            .attr('transform', function (d) {
              return transformIcon(d, 'lock');
            })
            .on('click', function (d) {
              d.fx = null;
              d.fy = null;

              iconLock.remove();
              iconCross.remove();
            });
          iconLockEnter.append('path').attr('class', 'overlay').attr('d', boxSVG);
          iconLockEnter.append('path').attr('d', lockIconSVG);

          var iconCrossEnter = iconCross.enter().append('g')
            .attr('class', 'crossIcon')
            .attr('transform', function () {
              return transformIcon(d, 'cross');
            })
            .on('click', function () {
              removeNode(d);
              updateGraph();
            });
          iconCrossEnter.append('path').attr('class', 'overlay').attr('d', boxSVG);
          iconCrossEnter.append('path').attr('d', crossIconSVG);

          iconLock = iconLockEnter
            .merge(iconLock);
          iconCross = iconCrossEnter
            .merge(iconCross);
        })
        .merge(circles);

      circleText.exit().remove();
      circleText = circleText.enter().append('text')
        .attr('y', textPosOffsetY)
        .attr('text-anchor', 'middle')
        .text(function (d) {
          if (d.properties.name != null) {
            return d.properties.name
          }
          // for displaying labels if not visible
          else {
            return d.labels
          }
        })
        .merge(circleText);

      lines.exit().remove();
      lines = lines.enter().append('path')
        //.attr('marker-end', 'url(#end-arrow)')
        .attr('title', function (d) { return d.type; })
        .attr('class', function (d) { return d.type; })
        .on('mouseover', function (d) {
          showProperties(d);
        })
        .merge(lines);

      lineText.exit().remove();
      lineText = lineText.enter().append('text')
        .attr('y', textPosOffsetY)
        .attr('text-anchor', 'middle')
        .text(function (d) { return replaceLinkTypeName(d); })
        .merge(lineText);

      d3Simulation
        .on('tick', tick);
    }
    function submitQuery(nodeID) {
      removeAlert();

      var queryStr = null;

      if (nodeID === null || !nodeID) {
        queryStr = $.trim($('#queryText').val());
        if (queryStr === '') {
          promptAlert($('#graphContainer'), 'Error: Search field cannot be empty !', true);
          return;
        }
        if ($('#chkboxCypherQry:checked').val() != 1)
          if ($('#limit:checked').val() == 10) {
            queryStr = 'match (n)-[]-() where n.Age  =~ \'(?i).*' + queryStr + '.*\' or n.A_Data =~ \'(?i).*' + queryStr + '.*\' or n.address  =~ \'(?i).*' + queryStr + '.*\' or n.C_Location =~ \'(?i).*' + queryStr + '.*\' or n.DL  =~ \'(?i).*' + queryStr + '.*\' or labels(n)[0]  =~ \'(?i).*' + queryStr + '.*\' or n.Date  =~ \'(?i).*' + queryStr + '.*\' or  n.G_Location=~ \'(?i).*' + queryStr + '.*\' or n.G_Name=~ \'(?i).*' + queryStr + '.*\' or n.Gender=~ \'(?i).*' + queryStr + '.*\' or n.Locality=~ \'(?i).*' + queryStr + '.*\' or n.Model=~ \'(?i).*' + queryStr + '.*\' or n.Name=~ \'(?i).*' + queryStr + '.*\' or n.No=~ \'(?i).*' + queryStr + '.*\' or n.Pincode=~ \'(?i).*' + queryStr + '.*\' or n.Timing=~ \'(?i).*' + queryStr + '.*\' or n.Type=~ \'(?i).*' + queryStr + '.*\' or n.V_Name=~ \'(?i).*' + queryStr + '.*\' or n.V_no=~ \'(?i).*' + queryStr + '.*\' or n.V_type=~ \'(?i).*' + queryStr + '.*\' return n limit 10';
            // queryStr = 'match (n)-[]-() WITH LABELS(n) AS labels , KEYS(n) AS keys UNWIND labels AS label UNWIND keys AS key where  n.label  =~ \'(?i).*' + queryStr + '.*\' return n limit 10';

          }
          else {
            queryStr = 'match (n)-[]-() where n.Age  =~ \'(?i).*' + queryStr + '.*\' or n.A_Data =~ \'(?i).*' + queryStr + '.*\' or n.address  =~ \'(?i).*' + queryStr + '.*\' or n.C_Location =~ \'(?i).*' + queryStr + '.*\' or n.DL  =~ \'(?i).*' + queryStr + '.*\' or labels(n)[0]  =~ \'(?i).*' + queryStr + '.*\' or n.Date  =~ \'(?i).*' + queryStr + '.*\' or  n.G_Location=~ \'(?i).*' + queryStr + '.*\' or n.G_Name=~ \'(?i).*' + queryStr + '.*\' or n.Gender=~ \'(?i).*' + queryStr + '.*\' or n.Locality=~ \'(?i).*' + queryStr + '.*\' or n.Model=~ \'(?i).*' + queryStr + '.*\' or n.Name=~ \'(?i).*' + queryStr + '.*\' or n.No=~ \'(?i).*' + queryStr + '.*\' or n.Pincode=~ \'(?i).*' + queryStr + '.*\' or n.Timing=~ \'(?i).*' + queryStr + '.*\' or n.Type=~ \'(?i).*' + queryStr + '.*\' or n.V_Name=~ \'(?i).*' + queryStr + '.*\' or n.V_no=~ \'(?i).*' + queryStr + '.*\' or n.V_type=~ \'(?i).*' + queryStr + '.*\' return n';
          }
      }

      else
        queryStr = 'match (n)-[j]-(k) where id(n) = ' + nodeID + ' return n,j,k';


      stopSimulation();

      if (nodeID === null || !nodeID) {
        nodeItemMap = {};
        linkItemMap = {};
      }
      getData(queryStr)

    }
    function getData(queryStr) {
      var jqxhr = $.post(neo4jAPIURL, '{"statements":[{"statement":"' + queryStr + '", "resultDataContents":["graph"]}]}',
        // var jqxhr = $.get(neo4jAPIURL,

        function (data) {
          if (data.errors !== null && data.errors.length > 0) {
            promptAlert($('#graphContainer'), 'Error: ' + data.errors[0].message + '(' + data.errors[0].code + ')', true);
            return;
          }

          if (data.results !== null && data.results.length > 0 && data.results[0].data !== null && data.results[0].data.length > 0) {
            var neo4jDataItmArray = data.results[0].data;
            neo4jDataItmArray.forEach(function (dataItem) {
              //Node
              if (dataItem.graph.nodes !== null && dataItem.graph.nodes.length > 0) {
                var neo4jNodeItmArray = dataItem.graph.nodes;
                neo4jNodeItmArray.forEach(function (nodeItm) {
                  if (!(nodeItm.id in nodeItemMap))
                    nodeItemMap[nodeItm.id] = nodeItm;
                });
              }
              //Link
              if (dataItem.graph.relationships !== null && dataItem.graph.relationships.length > 0) {
                var neo4jLinkItmArray = dataItem.graph.relationships;
                neo4jLinkItmArray.forEach(function (linkItm) {
                  if (!(linkItm.id in linkItemMap)) {
                    linkItm.source = linkItm.startNode;
                    linkItm.target = linkItm.endNode;
                    linkItemMap[linkItm.id] = linkItm;
                  }
                });
              }
            });

            // console.log('nodeItemMap.size:' + Object.keys(nodeItemMap).length);
            // console.log('linkItemMap.size:' + Object.keys(linkItemMap).length);

            updateGraph();
            return;
          }

          //also update graph when empty
          updateGraph();
          promptAlert($('#graphContainer'), 'No record found !', false);
        }, 'json');

      jqxhr.fail(function (data) {
        promptAlert($('#graphContainer'), 'Error: submitted query text but got error return (' + data + ')', true);
      });
    }
    function step1(nodeID) {
      removeAlert();
      var queryStr = que.q1;
      stopSimulation();
      if (nodeID === null || !nodeID) {
        nodeItemMap = {};
        linkItemMap = {};
      }
      $('#StepsText').text('Step1');
      getData(queryStr)
    }
    function step2(nodeID) {
      removeAlert();
      var queryStr = que.q2;
      stopSimulation();
      if (nodeID === null || !nodeID) {
        nodeItemMap = {};
        linkItemMap = {};
      }
      $('#StepsText').text('Step2');
      getData(queryStr)
    }
    function step3(nodeID) {
      removeAlert();
      var queryStr = que.q3;
      stopSimulation();
      if (nodeID === null || !nodeID) {
        nodeItemMap = {};
        linkItemMap = {};
      }
      $('#StepsText').text('Step3');
      getData(queryStr)
    }
    function step4(nodeID) {
      removeAlert();
      var queryStr = que.q4;
      stopSimulation();
      if (nodeID === null || !nodeID) {
        nodeItemMap = {};
        linkItemMap = {};
      }
      getData(queryStr)
      $('#StepsText').text('Step4');
    }

    // Function for stored queries will make it one function later


    function getItemColor(d) {
      if (!(d.labels[0] in itemColorMap))
        itemColorMap[d.labels[0]] = colorScale(d.labels[0]);
      return itemColorMap[d.labels[0]];
    }

    function getColorBrighter(targetColor) {
      return d3.rgb(targetColor).brighter(0.3).toString();
    }

    function getColorDarker(targetColor) {
      return d3.rgb(targetColor).darker().toString();
    }

    //Page Init
    $(function () {
      setupNeo4jLoginForAjax(neo4jLogin, neo4jPassword);

      initGraph();

      $('#queryText').keyup(function (e) {
        if (e.which === 13) {
          submitQuery();
        }
      });

      $('#btnSend').click(function () { submitQuery() });
      $('#step1').click(function () {
        step1()
        $("#stepsCall").text("Result Shows: " + test.step1)
      });
      $('#step2').click(function () {
        step2()

        $("#stepsCall").text("Result Shows: " + test.step2)
      });
      $('#step3').click(function () {
        step3()
        $("#stepsCall").text("Result Shows: " + test.step3)
      });
      $('#step4').click(function () {
        step4()
        $("#stepsCall").text("Result Shows: " + test.step4)
      });
      $('#zoom_in').click(function () { zoomIn() });
      $('#zoom_out').click(function () { zoomOut() });
      $('#reset').click(function () { reset() });
      // select the query depending on the button need to push it to the submit query

      $('#chkboxCypherQry').change(function () {
        if (this.checked)
          $('#queryText').prop('placeholder', 'Cypher');
        else
          $('#queryText').prop('placeholder', 'Search field');
      });

    });
  }
  render() {
    return (
      <div >

        <div className="container-fluid">
          <div className="search-div">
            <div className="search-input">
              <Input type="text" name="port" id="queryText" placeholder="Search field" />
            </div>
            <div className="search-button">
              <Button type="button" sm={2} id="btnSend" onSubmit={this.createChart}>
                Search <RiSearchLine />&nbsp;

          </Button> &nbsp;
      </div>

          </div>
          <div className="row label-select">
            <div className="col col-12 col-md-12 form-inline">
              <Input className="form-check-input" type="checkbox" id="chkboxCypherQry" value="1" />
              <Label className="form-check-label" htmlFor="chkboxCypherQry">Use Cypher Query </Label>&nbsp;
              <Input className="form-check-input" type="checkbox" id="limit" value="10" />
              <Label className="form-check-label" htmlFor="limit">Limit</Label>
            </div>
          </div>
          <div style={{ "display": "flex" }}>

            <Button onClick={this.handleClicked} style={{ "width": "fitContent%", "margin": "0", "marginBottom": "5px" }} >Filter<FiFilter /></Button>

            <div className={this.state.styleFilter}>
              <Button id="btnFullscreen" style={{ "marginTop": "3px" }} type="button">
                <i className="fa fa-icon-fullscreen" aria-hidden="true"></i>Full Screen&nbsp;
        </Button>&nbsp;

        <Button id="reset" style={{ "marginTop": "3px" }}
                type="button">Reset</Button>&nbsp;
        <Button id="zoom_in" style={{ "marginTop": "3px" }} type="button"
              >+</Button>&nbsp;
        <Button id="zoom_out" style={{ "marginTop": "3px" }}
                type="Button">-</Button>&nbsp;
            </div>
           &nbsp; <Button onClick={this.handleClick} style={{ "width": "140px", "margin": "0", "marginBottom": "5px" }} >Stored queries</Button>
            {/* <button id="download"  style={{ "marginTop": "3px" }}
            type="button">download</button>&nbsp; */}

          </div>
        </div>

        <hr />

        <div className="container-fluid">

          <div className="row" id='dl' >

            <div style={{ "display": "flex" }} id={this.state.menuStatus === "close" ? "graphContainerTop" : "graphContainerTopFull"}>
              <div className="col col-12 col-md-12" id="graphContainer">
                <svg id="resultSvg"></svg>

              </div>

              <div style={{ "width": "fit-content" }} className={this.state.menuStatus === "close" ? "sidenav" : "sidenavNot"} >

                <div>
                  <div className={this.state.style}>

                    <Button type="button" style={{ "width": "140px", "margin": "0", "marginBottom": "5px" }}
                      id="step1">
                      <i className="" aria-hidden="true"></i> Step 1&nbsp;
                    </Button>

                    <Button type="button" style={{ "width": "140px", "margin": "0", "marginBottom": "5px" }}

                      id="step2">
                      <i className="" aria-hidden="true"></i> Step 2&nbsp;
                    </Button>
                    <Button type="button" style={{ "width": "140px", "margin": "0", "marginBottom": "5px" }}

                      id="step3">
                      <i className="" aria-hidden="true"></i> Step 3&nbsp;
                    </Button>
                    <Button type="button" style={{ "width": "140px", "margin": "0", "marginBottom": "5px" }}

                      id="step4">
                      <i className="" aria-hidden="true"></i> Step 4&nbsp;
                    </Button>

                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col col-12 col-md-12">
              <div id="propertiesBox">
              </div>
            </div>
          </div>
        </div>

      </div >
    )
  }
}

export default App