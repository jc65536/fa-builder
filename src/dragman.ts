import { DragCtx } from "./drag.js";

let dragCtx: DragCtx = null;

export const setContext = (ctx: DragCtx) => dragCtx = ctx;

export const hasContext = () => dragCtx !== null;

export const handleDrag = (evt: MouseEvent) => dragCtx?.handleDrag(evt);

export const handleDrop = (evt: MouseEvent) => {
    dragCtx?.handleDrop(evt);
    dragCtx = null;
}
