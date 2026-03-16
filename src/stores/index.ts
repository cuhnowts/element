import { create } from "zustand";
import { createProjectSlice, type ProjectSlice } from "./projectSlice";
import { createTaskSlice, type TaskSlice } from "./taskSlice";
import { createUiSlice, type UiSlice } from "./uiSlice";

export type AppStore = ProjectSlice & TaskSlice & UiSlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createProjectSlice(...a),
  ...createTaskSlice(...a),
  ...createUiSlice(...a),
}));
