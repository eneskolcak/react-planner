import React, {useEffect} from "react";
import PropTypes from "prop-types";

import {
    ReactSVGPanZoom,
    TOOL_NONE,
    TOOL_PAN,
    TOOL_ZOOM_IN,
    TOOL_ZOOM_OUT,
    TOOL_AUTO,
} from "react-svg-pan-zoom";
import * as constants from "../../constants";
import State from "./state";
import * as SharedStyle from "../../shared-style";
import {RulerX, RulerY} from "./export";
import {GiArrowCursor} from "react-icons/gi";
import {FaRegHandPointer} from "react-icons/fa";
import {FiZoomIn, FiZoomOut} from "react-icons/fi";
import {MdFullscreen} from "react-icons/md";
import {fitToViewer} from "./fitToViewer";

function mode2Tool(mode) {
    switch (mode) {
        case constants.MODE_2D_PAN:
            return TOOL_PAN;
        case constants.MODE_2D_ZOOM_IN:
            return TOOL_ZOOM_IN;
        case constants.MODE_2D_ZOOM_OUT:
            return TOOL_ZOOM_OUT;
        case constants.MODE_IDLE:
            return TOOL_AUTO;
        default:
            return TOOL_NONE;
    }
}

function mode2PointerEvents(mode) {
    switch (mode) {
        case constants.MODE_DRAWING_LINE:
        case constants.MODE_DRAWING_HOLE:
        case constants.MODE_DRAWING_ITEM:
        case constants.MODE_DRAGGING_HOLE:
        case constants.MODE_DRAGGING_ITEM:
        case constants.MODE_DRAGGING_LINE:
        case constants.MODE_DRAGGING_VERTEX:
            return {pointerEvents: "none"};

        default:
            return {};
    }
}

function mode2Cursor(mode) {
    switch (mode) {
        case constants.MODE_DRAGGING_HOLE:
        case constants.MODE_DRAGGING_LINE:
        case constants.MODE_DRAGGING_VERTEX:
        case constants.MODE_DRAGGING_ITEM:
            return {cursor: "move"};

        case constants.MODE_ROTATING_ITEM:
            return {cursor: "ew-resize"};

        case constants.MODE_WAITING_DRAWING_LINE:
        case constants.MODE_DRAWING_LINE:
            return {cursor: "crosshair"};
        default:
            return {cursor: "default"};
    }
}

function mode2DetectAutopan(mode) {
    switch (mode) {
        case constants.MODE_DRAWING_LINE:
        case constants.MODE_DRAGGING_LINE:
        case constants.MODE_DRAGGING_VERTEX:
        case constants.MODE_DRAGGING_HOLE:
        case constants.MODE_DRAGGING_ITEM:
        case constants.MODE_DRAWING_HOLE:
        case constants.MODE_DRAWING_ITEM:
            return true;

        default:
            return false;
    }
}

function extractElementData(node) {
    while (
        !node.attributes.getNamedItem("data-element-root") &&
        node.tagName !== "svg"
        ) {
        node = node.parentNode;
    }
    if (node.tagName === "svg") return null;

    return {
        part: node.attributes.getNamedItem("data-part")
            ? node.attributes.getNamedItem("data-part").value
            : undefined,
        layer: node.attributes.getNamedItem("data-layer").value,
        prototype: node.attributes.getNamedItem("data-prototype").value,
        selected: node.attributes.getNamedItem("data-selected").value === "true",
        id: node.attributes.getNamedItem("data-id").value,
    };
}

export default function Viewer2D(
    {state, width, height, viewOnly, onClickOnItem},
    {
        viewer2DActions,
        linesActions,
        holesActions,
        verticesActions,
        itemsActions,
        areaActions,
        projectActions,
        catalog,
    }
) {
    let {viewer2D, mode, scene} = state;

    let layerID = scene.selectedLayer;

    let mapCursorPosition = ({x, y}) => {
        return {x, y: -y + scene.height};
    };

    let onMouseMove = (viewerEvent) => {
        //workaround that allow imageful component to work
        let evt = new Event("mousemove-planner-event");
        evt.viewerEvent = viewerEvent;
        document.dispatchEvent(evt);

        let {x, y} = mapCursorPosition(viewerEvent);

        projectActions.updateMouseCoord({x, y});

        switch (mode) {
            case constants.MODE_DRAWING_LINE:
                linesActions.updateDrawingLine(x, y, state.snapMask);
                break;

            case constants.MODE_DRAWING_HOLE:
                holesActions.updateDrawingHole(layerID, x, y);
                break;

            case constants.MODE_DRAWING_ITEM:
                itemsActions.updateDrawingItem(layerID, x, y);
                break;

            case constants.MODE_DRAGGING_HOLE:
                holesActions.updateDraggingHole(x, y);
                break;

            case constants.MODE_DRAGGING_LINE:
                linesActions.updateDraggingLine(x, y, state.snapMask);
                break;

            case constants.MODE_DRAGGING_VERTEX:
                verticesActions.updateDraggingVertex(x, y, state.snapMask);
                break;

            case constants.MODE_DRAGGING_ITEM:
                itemsActions.updateDraggingItem(x, y);
                break;

            case constants.MODE_ROTATING_ITEM:
                itemsActions.updateRotatingItem(x, y);
                break;
        }

        viewerEvent.originalEvent.stopPropagation();
    };

    let onMouseDown = (viewerEvent) => {
        let event = viewerEvent.originalEvent;

        //workaround that allow imageful component to work
        let evt = new Event("mousedown-planner-event");
        evt.viewerEvent = viewerEvent;
        document.dispatchEvent(evt);

        let {x, y} = mapCursorPosition(viewerEvent);

        if (mode === constants.MODE_IDLE) {
            let elementData = extractElementData(event.target);
            if (!elementData || !elementData.selected) return;

            switch (elementData.prototype) {
                case "lines":
                    if (!viewOnly)
                        linesActions.beginDraggingLine(
                            elementData.layer,
                            elementData.id,
                            x,
                            y,
                            state.snapMask
                        );
                    break;

                case "vertices":
                    if (!viewOnly)
                        verticesActions.beginDraggingVertex(
                            elementData.layer,
                            elementData.id,
                            x,
                            y,
                            state.snapMask
                        );
                    break;

                case "items":
                    if (!viewOnly)
                        if (elementData.part === "rotation-anchor")
                            itemsActions.beginRotatingItem(
                                elementData.layer,
                                elementData.id,
                                x,
                                y
                            );
                        else
                            itemsActions.beginDraggingItem(
                                elementData.layer,
                                elementData.id,
                                x,
                                y
                            );
                    break;

                case "holes":
                    if (!viewOnly)
                        holesActions.beginDraggingHole(
                            elementData.layer,
                            elementData.id,
                            x,
                            y
                        );
                    break;

                default:
                    break;
            }
        }
        event.stopPropagation();
    };

    let onMouseUp = (viewerEvent) => {
        let event = viewerEvent.originalEvent;

        let evt = new Event("mouseup-planner-event");
        evt.viewerEvent = viewerEvent;
        document.dispatchEvent(evt);

        let {x, y} = mapCursorPosition(viewerEvent);

        switch (mode) {
            case constants.MODE_IDLE:
                let elementData = extractElementData(event.target);

                if (elementData && elementData.selected) return;
                if (viewOnly) {
                    projectActions.unselectAll();
                }

                switch (elementData ? elementData.prototype : "none") {
                    case "areas":
                        if (!viewOnly)
                            areaActions.selectArea(elementData.layer, elementData.id);
                        break;

                    case "lines":
                        if (!viewOnly)
                            linesActions.selectLine(elementData.layer, elementData.id);
                        break;

                    case "holes":
                        if (!viewOnly)
                            holesActions.selectHole(elementData.layer, elementData.id);
                        break;

                    case "items":
                        if (!viewOnly)
                            itemsActions.selectItem(elementData.layer, elementData.id);
                        else onClickOnItem(elementData.id);
                        break;

                    case "none":
                        projectActions.unselectAll();
                        break;
                }

                break;

            case constants.MODE_WAITING_DRAWING_LINE:
                linesActions.beginDrawingLine(layerID, x, y, state.snapMask);
                break;

            case constants.MODE_DRAWING_LINE:
                linesActions.endDrawingLine(x, y, state.snapMask);
                linesActions.beginDrawingLine(layerID, x, y, state.snapMask);
                break;

            case constants.MODE_DRAWING_HOLE:
                holesActions.endDrawingHole(layerID, x, y);
                break;

            case constants.MODE_DRAWING_ITEM:
                itemsActions.endDrawingItem(layerID, x, y);

                projectActions.rollback();

                break;

            case constants.MODE_DRAGGING_LINE:
                linesActions.endDraggingLine(x, y, state.snapMask);
                break;

            case constants.MODE_DRAGGING_VERTEX:
                verticesActions.endDraggingVertex(x, y, state.snapMask);
                break;

            case constants.MODE_DRAGGING_ITEM:
                itemsActions.endDraggingItem(x, y);
                break;

            case constants.MODE_DRAGGING_HOLE:
                holesActions.endDraggingHole(x, y);
                break;

            case constants.MODE_ROTATING_ITEM:
                itemsActions.endRotatingItem(x, y);
                break;
        }

        event.stopPropagation();
    };

    let onChangeValue = (value) => {
        projectActions.updateZoomScale(value.a);
        return viewer2DActions.updateCameraView(value);
    };

    // useEffect(() => {
    //     let newValue = fitToViewer({
    //         SVGHeight: state.toJS().scene.height,
    //         SVGWidth: state.toJS().scene.width,
    //         viewerHeight: height,
    //         viewerWidth: width,
    //     });
    //     onChangeValue({...newValue, e: 0, f: 0});
    // }, []);

    let onChangeTool = (tool) => {
        switch (tool) {
            case TOOL_NONE:
                projectActions.selectToolEdit();
                break;

            case TOOL_PAN:
                viewer2DActions.selectToolPan();
                break;

            case TOOL_ZOOM_IN:
                viewer2DActions.selectToolZoomIn();
                break;

            case TOOL_ZOOM_OUT:
                viewer2DActions.selectToolZoomOut();
                break;
        }
    };

    let {e, f, SVGWidth, SVGHeight} = state.get("viewer2D").toJS();

    let rulerSize = 0; //px
    let rulerUnitPixelSize = 100;
    let rulerBgColor = SharedStyle.PRIMARY_COLOR.main;
    let rulerFnColor = SharedStyle.COLORS.white;
    let rulerMkColor = SharedStyle.SECONDARY_COLOR.main;
    let sceneWidth = SVGWidth || state.getIn(["scene", "width"]);
    let sceneHeight = SVGHeight || state.getIn(["scene", "height"]);
    let sceneZoom = state.zoom || 1;
    let rulerXElements = Math.ceil(sceneWidth / rulerUnitPixelSize) + 1;
    let rulerYElements = Math.ceil(sceneHeight / rulerUnitPixelSize) + 1;

    // const customToolBar = (props) => {
    //   return (
    //     <div
    //       style={{
    //         backgroundColor: "white",
    //         position: "absolute",
    //         display: "flex",
    //         border: "1px solid #D0D5DD",
    //         flexDirection: "column",
    //         gap: 32,
    //         borderRadius: 8,
    //         justifyContent: "space-around",
    //         top: 4,
    //         padding: 12,
    //         paddingTop: 8,
    //         paddingBottom: 8,
    //         color: "rgba(128, 128, 128, 1)",
    //         right: 1,
    //         borderRadius: 15,
    //       }}
    //     >
    //       {!viewOnly && (
    //         <label
    //           style={{
    //             width: "40px",
    //             height: "40px",
    //             display: "flex",
    //             alignItems: "center",
    //             justifyContent: "center",
    //             border: "1px solid #D0D5DD",
    //             cursor: "pointer",
    //             borderRadius: 5,
    //             backgroundColor:
    //               props.tool === "auto" ? "rgba(142, 67, 231, 1)" : "white",
    //             color: props.tool === "auto" ? "white" : "black",
    //           }}
    //           onClick={() => props.onChangeTool(TOOL_NONE)}
    //         >
    //           <GiArrowCursor />
    //         </label>
    //       )}
    //
    //       <label
    //         style={{
    //           width: "40px",
    //           height: "40px",
    //           display: "flex",
    //           alignItems: "center",
    //           justifyContent: "center",
    //           borderRadius: 6,
    //           border: "1px solid #D0D5DD",
    //           cursor: "pointer",
    //           borderRadius: 5,
    //
    //           backgroundColor:
    //             props.tool === TOOL_PAN ? "rgba(142, 67, 231, 1)" : "white",
    //           color: props.tool === TOOL_PAN ? "white" : "black",
    //         }}
    //         onClick={() => props.onChangeTool(TOOL_PAN)}
    //       >
    //         <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
    //           <path
    //             d="M10.6867 9.21156V2.31119C10.6867 1.63901 10.1907 1.09348 9.57967 1.09348C8.9686 1.09348 8.47266 1.63901 8.47266 2.31119V9.21156"
    //             stroke="currentColor"
    //             stroke-linecap="round"
    //             stroke-linejoin="round"
    //           />
    //           <path
    //             d="M10.6875 3.81488C10.6875 3.12742 11.1834 2.56949 11.7945 2.56949C12.4056 2.56949 12.9015 3.12742 12.9015 3.81488V9.21156"
    //             stroke="currentColor"
    //             stroke-linecap="round"
    //             stroke-linejoin="round"
    //           />
    //           <path
    //             d="M8.2955 3.7995C8.2955 3.12053 7.7862 2.56949 7.15867 2.56949C6.53115 2.56949 6.02185 3.12053 6.02185 3.7995V8.30955V10.7696L4.58112 9.21073C4.12108 8.71299 3.37533 8.71299 2.91529 9.21073C2.51816 9.64042 2.45677 10.3136 2.76826 10.8188L5.42994 15.1386C6.27347 16.5072 7.69298 17.3296 9.21329 17.3296H10.5691C13.0808 17.3296 15.1164 15.1271 15.1164 12.4096V8.30955V5.43952C15.1164 4.76055 14.6071 4.2095 13.9796 4.2095C13.3521 4.2095 12.8428 4.76055 12.8428 5.43952"
    //             stroke="currentColor"
    //             stroke-linecap="round"
    //             stroke-linejoin="round"
    //           />
    //         </svg>
    //       </label>
    //       <label
    //         style={{
    //           width: "40px",
    //           height: "40px",
    //           border: "1px solid #D0D5DD",
    //           display: "flex",
    //           color: "black",
    //           borderRadius: 6,
    //           alignItems: "center",
    //           justifyContent: "center",
    //           cursor: "pointer",
    //           borderRadius: 5,
    //           borderColor: "#D0D5DD",
    //           backgroundColor:
    //             props.tool === TOOL_ZOOM_IN ? "rgba(142, 67, 231, 1)" : "white",
    //           color: props.tool === TOOL_ZOOM_IN ? "white" : "black",
    //         }}
    //         onClick={() => props.onChangeTool(TOOL_ZOOM_IN)}
    //       >
    //         <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    //           <path
    //             d="M14 14L11.1 11.1M7.33333 5.33333V9.33333M5.33333 7.33333H9.33333M12.6667 7.33333C12.6667 10.2789 10.2789 12.6667 7.33333 12.6667C4.38781 12.6667 2 10.2789 2 7.33333C2 4.38781 4.38781 2 7.33333 2C10.2789 2 12.6667 4.38781 12.6667 7.33333Z"
    //             stroke="currentColor"
    //             stroke-linecap="round"
    //             stroke-linejoin="round"
    //           />
    //         </svg>
    //       </label>
    //       <label
    //         style={{
    //           width: "40px",
    //           height: "40px",
    //           display: "flex",
    //           alignItems: "center",
    //           justifyContent: "center",
    //           cursor: "pointer",
    //           borderRadius: 6,
    //           color: "black",
    //           borderRadius: 5,
    //           border: "1px solid #D0D5DD",
    //           borderColor: "#D0D5DD",
    //           backgroundColor:
    //             props.tool === TOOL_ZOOM_OUT ? "rgba(142, 67, 231, 1)" : "white",
    //           color: props.tool === TOOL_ZOOM_OUT ? "white" : "black",
    //         }}
    //         onClick={() => props.onChangeTool(TOOL_ZOOM_OUT)}
    //       >
    //         <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    //           <path
    //             d="M14 14L11.1 11.1M5.33333 7.33333H9.33333M12.6667 7.33333C12.6667 10.2789 10.2789 12.6667 7.33333 12.6667C4.38781 12.6667 2 10.2789 2 7.33333C2 4.38781 4.38781 2 7.33333 2C10.2789 2 12.6667 4.38781 12.6667 7.33333Z"
    //             stroke="currentColor"
    //             stroke-linecap="round"
    //             stroke-linejoin="round"
    //           />
    //         </svg>
    //       </label>
    //       <label
    //         style={{
    //           width: "40px",
    //           height: "40px",
    //           display: "flex",
    //           alignItems: "center",
    //           borderColor: "#D0D5DD",
    //           color: "black",
    //           justifyContent: "center",
    //           borderRadius: 6,
    //           border: "1px solid #D0D5DD",
    //           cursor: "pointer",
    //         }}
    //         onClick={() => {
    //           let newValue = fitToViewer(props.value);
    //           props.onChangeValue({ ...newValue, e: 0, f: 0 });
    //         }}
    //       >
    //         <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    //           <g clip-path="url(#clip0_4173_96306)">
    //             <path
    //               d="M1.5 1C1.36739 1 1.24021 1.05268 1.14645 1.14645C1.05268 1.24021 1 1.36739 1 1.5V5.5C1 5.63261 0.947322 5.75979 0.853553 5.85355C0.759785 5.94732 0.632608 6 0.5 6C0.367392 6 0.240215 5.94732 0.146447 5.85355C0.0526784 5.75979 0 5.63261 0 5.5V1.5C0 1.10218 0.158035 0.720644 0.43934 0.43934C0.720644 0.158035 1.10218 0 1.5 0L5.5 0C5.63261 0 5.75979 0.0526784 5.85355 0.146447C5.94732 0.240215 6 0.367392 6 0.5C6 0.632608 5.94732 0.759785 5.85355 0.853553C5.75979 0.947322 5.63261 1 5.5 1H1.5ZM10 0.5C10 0.367392 10.0527 0.240215 10.1464 0.146447C10.2402 0.0526784 10.3674 0 10.5 0L14.5 0C14.8978 0 15.2794 0.158035 15.5607 0.43934C15.842 0.720644 16 1.10218 16 1.5V5.5C16 5.63261 15.9473 5.75979 15.8536 5.85355C15.7598 5.94732 15.6326 6 15.5 6C15.3674 6 15.2402 5.94732 15.1464 5.85355C15.0527 5.75979 15 5.63261 15 5.5V1.5C15 1.36739 14.9473 1.24021 14.8536 1.14645C14.7598 1.05268 14.6326 1 14.5 1H10.5C10.3674 1 10.2402 0.947322 10.1464 0.853553C10.0527 0.759785 10 0.632608 10 0.5ZM0.5 10C0.632608 10 0.759785 10.0527 0.853553 10.1464C0.947322 10.2402 1 10.3674 1 10.5V14.5C1 14.6326 1.05268 14.7598 1.14645 14.8536C1.24021 14.9473 1.36739 15 1.5 15H5.5C5.63261 15 5.75979 15.0527 5.85355 15.1464C5.94732 15.2402 6 15.3674 6 15.5C6 15.6326 5.94732 15.7598 5.85355 15.8536C5.75979 15.9473 5.63261 16 5.5 16H1.5C1.10218 16 0.720644 15.842 0.43934 15.5607C0.158035 15.2794 0 14.8978 0 14.5L0 10.5C0 10.3674 0.0526784 10.2402 0.146447 10.1464C0.240215 10.0527 0.367392 10 0.5 10ZM15.5 10C15.6326 10 15.7598 10.0527 15.8536 10.1464C15.9473 10.2402 16 10.3674 16 10.5V14.5C16 14.8978 15.842 15.2794 15.5607 15.5607C15.2794 15.842 14.8978 16 14.5 16H10.5C10.3674 16 10.2402 15.9473 10.1464 15.8536C10.0527 15.7598 10 15.6326 10 15.5C10 15.3674 10.0527 15.2402 10.1464 15.1464C10.2402 15.0527 10.3674 15 10.5 15H14.5C14.6326 15 14.7598 14.9473 14.8536 14.8536C14.9473 14.7598 15 14.6326 15 14.5V10.5C15 10.3674 15.0527 10.2402 15.1464 10.1464C15.2402 10.0527 15.3674 10 15.5 10Z"
    //               fill="currentColor"
    //             />
    //           </g>
    //           <defs>
    //             <clipPath id="clip0_4173_96306">
    //               <rect width="16" height="16" fill="currentColor" />
    //             </clipPath>
    //           </defs>
    //         </svg>
    //       </label>
    //     </div>
    //   );
    // };

    return (
        <div
            style={{
                margin: 0,
                padding: 0,
                display: "grid",
                gridRowGap: "0",
                gridColumnGap: "0",
                gridTemplateColumns: `${rulerSize}px ${width - rulerSize}px`,
                gridTemplateRows: `${rulerSize}px ${height - rulerSize}px`,
                position: "relative",
            }}
        >
            <div
                style={{gridColumn: 1, gridRow: 1, backgroundColor: rulerBgColor}}
            ></div>
            <div
                style={{
                    gridRow: 1,
                    gridColumn: 2,
                    position: "relative",
                    overflow: "hidden",
                }}
                id="rulerX"
            >
                {sceneWidth ? (
                    <RulerX
                        unitPixelSize={rulerUnitPixelSize}
                        zoom={sceneZoom}
                        mouseX={state.mouse.get("x")}
                        width={width - rulerSize}
                        zeroLeftPosition={e || 0}
                        backgroundColor={rulerBgColor}
                        fontColor={rulerFnColor}
                        markerColor={rulerMkColor}
                        positiveUnitsNumber={rulerXElements}
                        negativeUnitsNumber={0}
                    />
                ) : null}
            </div>
            <div
                style={{
                    gridColumn: 1,
                    gridRow: 2,
                    position: "relative",
                    overflow: "hidden",
                }}
                id="rulerY"
            >
                {sceneHeight ? (
                    <RulerY
                        unitPixelSize={rulerUnitPixelSize}
                        zoom={sceneZoom}
                        mouseY={state.mouse.get("y")}
                        height={height - rulerSize}
                        zeroTopPosition={sceneHeight * sceneZoom + f || 0}
                        backgroundColor={rulerBgColor}
                        fontColor={rulerFnColor}
                        markerColor={rulerMkColor}
                        positiveUnitsNumber={rulerYElements}
                        negativeUnitsNumber={0}
                    />
                ) : null}
            </div>
            <ReactSVGPanZoom
                width={width}
                height={height}
                value={viewer2D.isEmpty() ? null : viewer2D.toJS()}
                onChangeValue={(value) => {
                    onChangeValue(value);
                }}
                tool={mode2Tool(mode)}
                onChangeTool={onChangeTool}
                detectAutoPan={mode2DetectAutopan(mode)}
                onMouseDown={onMouseDown}
                background={"#fff"}
                miniatureBackground={"#fff"}
                onMouseMove={onMouseMove}
                // customToolbar={customToolBar}
                onMouseUp={onMouseUp}
                miniaturePosition="none"
                toolbarPosition="none"
            >
                <svg width={scene.width} height={scene.height}>
                    <defs>
                        <pattern
                            id="diagonalFill"
                            patternUnits="userSpaceOnUse"
                            width="4"
                            height="4"
                            fill="#FFF"
                        >
                            <rect x="0" y="0" width="4" height="4" fill="#FFF"/>
                            <path
                                d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2"
                                style={{stroke: "#7F56D9", strokeWidth: 2}}
                            />
                        </pattern>
                    </defs>
                    <g style={Object.assign(mode2Cursor(mode), mode2PointerEvents(mode))}>
                        <State state={state} catalog={catalog}/>
                    </g>
                </svg>
            </ReactSVGPanZoom>
        </div>
    );
}

Viewer2D.propTypes = {
    state: PropTypes.object.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
};

Viewer2D.contextTypes = {
    viewer2DActions: PropTypes.object.isRequired,
    linesActions: PropTypes.object.isRequired,
    holesActions: PropTypes.object.isRequired,
    verticesActions: PropTypes.object.isRequired,
    itemsActions: PropTypes.object.isRequired,
    areaActions: PropTypes.object.isRequired,
    projectActions: PropTypes.object.isRequired,
    catalog: PropTypes.object.isRequired,
};
