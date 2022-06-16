import { TextGeometry, Mesh } from "three";
import React from "react";

const a = {
  name: "round column",
  prototype: "items",

  info: {
    tag: ["structure"],
    title: "",
    description: "round column",
    image: require("./column.png"),
  },

  properties: {
    altitude: {
      label: "altitude",
      type: "length-measure",
      defaultValue: {
        length: 0,
        unit: "cm",
      },
    },
    height: {
      label: "height",
      type: "length-measure",
      defaultValue: {
        length: 300,
        unit: "cm",
      },
    },
    radius: {
      label: "radius",
      type: "length-measure",
      defaultValue: {
        length: 30,
        unit: "cm",
      },
    },
  },

  render2D: function (element, layer, scene) {
    let RADIUS = element.properties.get("radius").get("length");
    let angle = element.rotation + 90;

    let textRotation = 0;
    if (Math.sin((angle * Math.PI) / 180) < 0) {
      textRotation = 180;
    }

    let circleStyle = {
      stroke: element.selected ? "#000" : "#000",
      strokeWidth: "2px",
      fill: "#FEFAF3",
    };

    return (
      <g>
        <circle
          width={100}
          height={100}
          key="1"
          cx="0"
          cy="0"
          r={RADIUS}
          style={circleStyle}
        />
        <text
          key="2"
          cx="0"
          cy="0"
          transform={`scale(1,-1) rotate(${textRotation})`}
          style={{ textAnchor: "middle", fontSize: "11px" }}
        ></text>
      </g>
    );
  },

  render3D: function (element, layer, scene) {
    let mesh = new Mesh(new TextGeometry("text"));

    mesh.position.y += element.properties.getIn(["altitude", "length"]);
    mesh.position.x -= 200 / 2;

    return Promise.resolve(mesh);
  },
};
export default a;
