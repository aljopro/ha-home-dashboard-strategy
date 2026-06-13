# Lovelace badge editor workflow

This note documents the Home Assistant frontend pattern for adding and customizing badges in a Lovelace dashboard editor. It is written as a practical reference you can adapt for your own dashboard strategy or custom badge implementation.

## 1. What the editor relies on

The badge editor pipeline is built around two generic contracts:

- badge runtime element: a badge component that renders the badge
- badge editor element: a visual or schema-based editor used in edit mode

The editor uses the badge type to decide how to render the configuration UI:

- if the badge class exposes `getConfigElement()`, the editor loads that custom UI element
- if it exposes `getConfigForm()`, the editor uses the schema-based form path

This is the main integration point you want to support if you want badges to be editable in the dashboard UI.

## 2. Core files to study

These are the most relevant implementation references in the current frontend:

- [src/panels/lovelace/badges/hui-view-badges.ts](../src/panels/lovelace/badges/hui-view-badges.ts) — renders the badges row in edit mode and supports add / reorder / remove interactions
- [src/panels/lovelace/components/hui-badge-edit-mode.ts](../src/panels/lovelace/components/hui-badge-edit-mode.ts) — handles hover menu, edit, duplicate, copy, cut, and delete actions
- [src/panels/lovelace/views/hui-view.ts](../src/panels/lovelace/views/hui-view.ts) — dispatches badge-create / badge-edit / badge-delete events
- [src/panels/lovelace/editor/badge-editor/show-edit-badge-dialog.ts](../src/panels/lovelace/editor/badge-editor/show-edit-badge-dialog.ts) — opens the editing dialog
- [src/panels/lovelace/editor/badge-editor/hui-dialog-edit-badge.ts](../src/panels/lovelace/editor/badge-editor/hui-dialog-edit-badge.ts) — visual editor dialog with preview and YAML toggle
- [src/panels/lovelace/editor/badge-editor/hui-badge-element-editor.ts](../src/panels/lovelace/editor/badge-editor/hui-badge-element-editor.ts) — picks the proper visual editor form
- [src/panels/lovelace/editor/config-elements/hui-entity-badge-editor.ts](../src/panels/lovelace/editor/config-elements/hui-entity-badge-editor.ts) — example of a schema-driven badge editor
- [src/panels/lovelace/types.ts](../src/panels/lovelace/types.ts) — editor contracts and interfaces

## 3. Minimum badge support you should implement

If your project wants to support badge creation and customization in the same way, your badge type should provide:

1. a runtime badge element that renders the badge
2. a configuration interface for the badge config
3. a visual editor or config form for edit mode
4. a stub config factory if you want users to create a new badge from the UI

### Recommended contract

Your badge implementation should expose one of these hooks:

```ts
export interface LovelaceBadgeConstructor {
  getStubConfig?: () => LovelaceBadgeConfig;
  getConfigElement?: () => LovelaceBadgeEditor;
  getConfigForm?: () => LovelaceConfigForm;
}
```

This is the same contract used by the existing Lovelace frontend.

## 4. Badge editor pattern

A practical way to support badge customization is:

### Option A: custom visual editor element

Implement a small editor element that:

- receives the current badge config
- renders fields using `ha-form` or standard controls
- emits `config-changed` when the user updates values

Example shape:

```ts
@customElement("my-badge-editor")
export class MyBadgeEditor extends LitElement implements LovelaceBadgeEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: MyBadgeConfig;

  public setConfig(config: MyBadgeConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}
```

### Option B: schema-based form

If your badge options are simple, use a `getConfigForm()` path instead of a full custom UI element. This keeps the editor compact and uses the same form system as the built-in HA badge editor.

## 5. How to support badge creation

To let users add a new badge from the dashboard UI:

1. expose a stub config for your badge type
2. register the badge type with the standard Lovelace element loader
3. ensure the editor can create an instance from that stub config

A typical pattern is:

```ts
static getStubConfig(): LovelaceBadgeConfig {
  return {
    type: "my-custom-badge",
    // default values here
  };
}
```

Then the dashboard editor can offer the badge as an addable type.

## 6. Reuse the existing badge row UX

If you want the same look and behavior as the native dashboard editor, keep these two parts:

- edit overlay / menu behavior from [src/panels/lovelace/components/hui-badge-edit-mode.ts](../src/panels/lovelace/components/hui-badge-edit-mode.ts)
- badge row rendering and sorting from [src/panels/lovelace/badges/hui-view-badges.ts](../src/panels/lovelace/badges/hui-view-badges.ts)

These pieces already handle:

- hover/focus editing affordances
- menu actions for edit / duplicate / copy / cut / delete
- sortable badge arrangement
- add-badge entry point

If your own dashboard strategy needs the same UX, reuse this structure rather than building a parallel badge editor from scratch.

## 7. Recommended implementation checklist

Use this checklist when adding badge support to your project:

- [ ] Define the badge config shape
- [ ] Implement the runtime badge renderer
- [ ] Add a visual editor or schema form
- [ ] Expose `getConfigElement()` or `getConfigForm()`
- [ ] Provide a `getStubConfig()` for new badge creation
- [ ] Ensure the badge can be saved back into the dashboard config
- [ ] Support preview / live update while editing
- [ ] Keep the editor accessible and keyboard-friendly

## 8. Practical takeaway

The Home Assistant frontend already solves this with a reusable pattern:

- runtime badge element
- editor contract
- generic dialog and save flow

If your own dashboard strategy adds the same two hooks, the majority of the badge editing workflow can be reused directly.
