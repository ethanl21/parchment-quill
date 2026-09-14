import { describe, expect, it } from "vite-plus/test";
import { toCSharp } from "./export-csharp";
import { importBook, newElement, newPage, seedDoc, toExportObject } from "./model";
import { validateDoc } from "./validate";

describe("export round-trip", () => {
  it("seed round-trips through JSON", () => {
    const json = JSON.stringify(toExportObject(seedDoc()));
    const again = JSON.stringify(toExportObject(importBook(JSON.parse(json))));
    expect(again).toBe(json);
  });

  it("seed has no errors", () => {
    expect(validateDoc(seedDoc()).filter((i) => i.level === "error")).toEqual([]);
  });

  it("flags dup page ids + button without action", () => {
    const doc = seedDoc();
    doc.book.Pages.push(newPage({ Id: "cover" }));
    doc.book.Pages[0].Elements.push(newElement("Button", { Text: "dead" }));
    const errors = validateDoc(doc)
      .filter((i) => i.level === "error")
      .map((i) => i.message);
    expect(errors.some((m) => m.includes('Duplicate page Id "cover"'))).toBe(true);
    expect(errors.some((m) => m.includes("needs an Action"))).toBe(true);
  });
});

describe("C# export", () => {
  it("emits seed book builders", () => {
    const cs = toCSharp(seedDoc());
    expect(cs).toContain('parchment.CreateBook("MyMod_CampingGuide")');
    expect(cs).toContain('AddPage("cover")');
    expect(cs).toContain('AddTitle("Camping Guide").Alignment("Center")');
    expect(cs).toContain('AddItemImage("(O)24")');
    expect(cs).toContain('AddButton("Back to start", "PeacefulEnd.Parchment_GoToStart")');
  });

  it("nests panels + grid templates", () => {
    const doc = seedDoc();
    const panel = newElement("Panel", { TexturePath: "Mods/X/frame" });
    panel.Children = [newElement("Paragraph", { Text: "hi" })];
    const grid = newElement("Grid", { Columns: 2, CellWidth: 20, CellHeight: 20 });
    grid.Source = {
      ItemQuery: "ALL_ITEMS (O)",
      Template: newElement("Image", { Scale: 3 }),
    };
    doc.book.Pages[0].Elements.push(panel, grid);
    const cs = toCSharp(doc);
    expect(cs).toContain(".AddPanel()");
    expect(cs).toContain(".AddChild(");
    expect(cs).toContain(".AddGrid(20, 20, columns: 2)");
    expect(cs).toContain(".AddSourceTemplate(");
  });
});
