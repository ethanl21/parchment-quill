// Mirror of Parchment's BookData / PageData / element schema.
// Editor-only keys (`uid`) are stripped on export; unknown fields met on
// import are stashed in `passthrough` and merged back on export.

export type ElementType =
  | "Title"
  | "Heading"
  | "Paragraph"
  | "Image"
  | "Divider"
  | "Panel"
  | "Banner"
  | "Button"
  | "PageNumber"
  | "Grid"
  | "Input";

export interface Rect {
  X: number;
  Y: number;
  Width: number;
  Height: number;
}

export interface Point {
  X: number;
  Y: number;
}

export interface GridSource {
  Template?: ElementData;
  ItemQuery?: string;
  PerItemCondition?: string;
  InputId?: string;
  OrderBy?: string;
  OrderDescending?: boolean;
  Count?: number;
}

export interface ElementData {
  uid: string;
  Type: ElementType;
  Id?: string;
  Text?: string;
  Alignment?: string;
  VerticalAlignment?: string;
  Scale?: number;
  TextScale?: number;
  SpacingAfter?: number;
  MarginLeft?: number;
  MarginRight?: number;
  Position?: Point;
  Condition?: string;
  Lifetime?: number;
  FadeAfter?: number;
  IgnoreCursor?: boolean;
  Action?: string;
  Actions?: string[];
  Sound?: string | null;
  HoverAction?: string;
  HoverActions?: string[];
  DisplayName?: string;
  Description?: string;
  Tags?: string[];
  FontType?: string;
  TextColor?: string;
  ShadowColor?: string;
  TexturePath?: string;
  TextureSourceRectangle?: Rect;
  HoverTextureSourceRectangle?: Rect;
  TintColor?: string;
  ItemId?: string;
  Sizing?: string;
  Width?: number;
  Height?: number;
  Thickness?: number;
  Padding?: number;
  CapWidth?: number;
  TextOffset?: Point;
  TextAlignment?: string;
  TextArea?: Rect;
  Rotation?: number;
  Origin?: Point;
  Columns?: number;
  Rows?: number;
  CellWidth?: number;
  CellHeight?: number;
  ColumnSpacing?: number;
  RowSpacing?: number;
  Scope?: string;
  Format?: string;
  InputId?: string;
  Placeholder?: string;
  PlaceholderColor?: string;
  MaxLength?: number;
  SubmitAction?: string;
  SubmitActions?: string[];
  TextChangedAction?: string;
  TextChangedActions?: string[];
  TextChangedDelay?: number;
  Children?: ElementData[];
  Background?: ElementData[];
  Foreground?: ElementData[];
  Source?: GridSource;
  passthrough?: Record<string, unknown>;
}

export interface OnViewEntry {
  Condition?: string;
  Actions: string[];
}

export interface KeybindEntry {
  Keybind: string;
  Condition?: string;
  Action?: string;
  Actions?: string[];
  Sound?: string;
}

export interface PageData {
  uid: string;
  Id: string;
  ChapterId?: string;
  Condition?: string;
  Tags?: string[];
  Elements: ElementData[];
  Background: ElementData[];
  Foreground: ElementData[];
  OnView: OnViewEntry[];
  OnKeyPress: KeybindEntry[];
  passthrough?: Record<string, unknown>;
}

export interface BookData {
  Format: string;
  SpritePath?: string;
  Pages: PageData[];
  Underlay: ElementData[];
  Overlay: ElementData[];
  StartOnCover?: boolean;
  ExitToCover?: boolean;
  Layout: {
    MarginOuter?: number;
    MarginSpine?: number;
    MarginTop?: number;
    MarginBottom?: number;
    IsSinglePage?: boolean;
  };
  Appearance: {
    TintColor?: string;
    Scale?: number;
  };
  OnKeyPress: KeybindEntry[];
  passthrough?: Record<string, unknown>;
}

/** Whole editor document. The exported book Id is composed from these. */
export interface Doc {
  modId: string;
  slug: string;
  useToken: boolean;
  book: BookData;
}

export type ElementListName = "elements" | "background" | "foreground" | "children";

export const ELEMENT_TYPES: ElementType[] = [
  "Title",
  "Heading",
  "Paragraph",
  "Image",
  "Divider",
  "Panel",
  "Banner",
  "Button",
  "PageNumber",
  "Grid",
  "Input",
];
