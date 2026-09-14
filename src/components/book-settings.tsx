import { ElementList } from "./elements";
import { AdvancedSection } from "./ui/advanced-section";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Check, Field, Input, Num } from "./ui/fields";
import type { BookAction } from "../state/book-reducer";
import type { Doc } from "../types/parchment";

export function BookSettings({
  doc,
  dispatch,
}: {
  doc: Doc;
  dispatch: React.Dispatch<BookAction>;
}) {
  const { book } = doc;
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="border-b-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-500/10">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Book</h2>
        </CardHeader>
        <CardBody>
          {/* Identity. */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mod ID">
              <Input
                className="font-mono text-xs"
                value={doc.modId}
                onChange={(e) => dispatch({ type: "set-meta", patch: { modId: e.target.value } })}
              />
            </Field>
            <Field label="Book name">
              <Input
                className="font-mono text-xs"
                value={doc.slug}
                onChange={(e) => dispatch({ type: "set-meta", patch: { slug: e.target.value } })}
              />
            </Field>
          </div>

          {/* How the exported book Id is composed. */}
          <Check
            label="Use {{ModId}} token in Id (Content Patcher)"
            checked={doc.useToken}
            onChange={(v) => dispatch({ type: "set-meta", patch: { useToken: v } })}
          />

          {/* Format version and item sprite. */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Format">
              <Input
                className="font-mono text-xs"
                value={book.Format}
                onChange={(e) =>
                  dispatch({ type: "update-book", patch: { Format: e.target.value } })
                }
              />
            </Field>
            <Field label="SpritePath (item icon asset)">
              <Input
                className="font-mono text-xs"
                value={book.SpritePath ?? ""}
                onChange={(e) =>
                  dispatch({
                    type: "update-book",
                    patch: { SpritePath: e.target.value || undefined },
                  })
                }
              />
            </Field>
          </div>

          {/* Cover behavior. */}
          <div className="flex gap-4">
            <Check
              label="StartOnCover"
              checked={book.StartOnCover}
              onChange={(v) =>
                dispatch({ type: "update-book", patch: { StartOnCover: v || undefined } })
              }
            />
            <Check
              label="ExitToCover"
              checked={book.ExitToCover}
              onChange={(v) =>
                dispatch({ type: "update-book", patch: { ExitToCover: v || undefined } })
              }
            />
          </div>
          <AdvancedSection title="Layout (page margins, unscaled sprite px)">
            {/* Margins. */}
            <div className="grid grid-cols-2 gap-2">
              <Field label="MarginOuter">
                <Num
                  value={book.Layout.MarginOuter}
                  onChange={(v) => dispatch({ type: "update-layout", patch: { MarginOuter: v } })}
                />
              </Field>
              <Field label="MarginSpine">
                <Num
                  value={book.Layout.MarginSpine}
                  onChange={(v) => dispatch({ type: "update-layout", patch: { MarginSpine: v } })}
                />
              </Field>
              <Field label="MarginTop">
                <Num
                  value={book.Layout.MarginTop}
                  onChange={(v) => dispatch({ type: "update-layout", patch: { MarginTop: v } })}
                />
              </Field>
              <Field label="MarginBottom">
                <Num
                  value={book.Layout.MarginBottom}
                  onChange={(v) => dispatch({ type: "update-layout", patch: { MarginBottom: v } })}
                />
              </Field>
            </div>
            <Check
              label="IsSinglePage (one page per spread)"
              checked={book.Layout.IsSinglePage}
              onChange={(v) =>
                dispatch({ type: "update-layout", patch: { IsSinglePage: v || undefined } })
              }
            />
          </AdvancedSection>
          <AdvancedSection title="Appearance">
            {/* Tint and scale. */}
            <div className="grid grid-cols-2 gap-2">
              <Field label="TintColor">
                <Input
                  value={book.Appearance.TintColor ?? ""}
                  onChange={(e) =>
                    dispatch({
                      type: "update-appearance",
                      patch: { TintColor: e.target.value || undefined },
                    })
                  }
                />
              </Field>
              <Field label="Scale">
                <Num
                  value={book.Appearance.Scale}
                  onChange={(v) => dispatch({ type: "update-appearance", patch: { Scale: v } })}
                />
              </Field>
            </div>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Custom book art (TexturePath, frames, PageCurl, Animation) stays in the JSON via
              import; the editor keeps those fields untouched.
            </p>
          </AdvancedSection>
        </CardBody>
      </Card>
      <Card>
        <CardHeader className="border-b-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-500/10">
          <h2 className="text-sm font-semibold text-violet-900 dark:text-violet-200">
            Overlay ({book.Overlay.length}): drawn over everything
          </h2>
        </CardHeader>
        <CardBody>
          <ElementList
            target={{ kind: "book", list: "overlay" }}
            elements={book.Overlay}
            dispatch={dispatch}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader className="border-b-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-500/10">
          <h2 className="text-sm font-semibold text-sky-900 dark:text-sky-200">
            Underlay ({book.Underlay.length}): drawn behind the book
          </h2>
        </CardHeader>
        <CardBody>
          <ElementList
            target={{ kind: "book", list: "underlay" }}
            elements={book.Underlay}
            dispatch={dispatch}
          />
        </CardBody>
      </Card>
    </div>
  );
}
