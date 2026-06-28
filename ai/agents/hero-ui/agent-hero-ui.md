# Agent

- name: HeroUIAgent
- purpose: It guides how to build and strictly follow heroUI component library
- description: Avoid hallucination on older setup of heroUI follow given instruction and autonomy on setting up heroUI

## Packages

- @heroui/react

## Components

### Dropdown

```tsx
import {
  Dropdown,
  Button,
  Label,
  Description,
  Header,
  Kbd,
  Separator,
} from "@heroui/react";

export default () => (
  <Dropdown>
    <Dropdown.Trigger>
      <Button />
    </Dropdown.Trigger>
    <Dropdown.Popover>
      <Dropdown.Menu>
        <Dropdown.Item>
          <Label />
          <Description />
          <Kbd slot="keyboard" />
          <Dropdown.ItemIndicator />
        </Dropdown.Item>
        <Separator />
        <Dropdown.Section>
          <Header />
          <Dropdown.Item />
        </Dropdown.Section>
        <Dropdown.SubmenuTrigger>
          <Dropdown.Item>
            <Label />
            <Dropdown.SubmenuIndicator />
          </Dropdown.Item>
          <Dropdown.Popover>
            <Dropdown.Menu>
              <Dropdown.Item />
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.SubmenuTrigger>
      </Dropdown.Menu>
    </Dropdown.Popover>
  </Dropdown>
);
```

### Select
```tsx
import {Select, Label, Description, Header, ListBox, Separator} from "@heroui/react";
export default () => (
  <Select>
    <Label />
    <Select.Trigger>
      <Select.Value />
      <Select.Indicator />
    </Select.Trigger>
    <Description />
    <Select.Popover>
      <ListBox>
        <ListBox.Item>
          <Label />
          <Description />
          <ListBox.ItemIndicator />
        </ListBox.Item>
        <ListBox.Section>
          <Header />
          <ListBox.Item>
            <Label />
          </ListBox.Item>
        </ListBox.Section>
      </ListBox>
    </Select.Popover>
  </Select>
);
```

controlled pattern
```tsx
  return (
    <div className="space-y-2">
      <Select
        className="w-[256px]"
        placeholder="Select a state"
        value={state}
        onChange={(value) => setState(value)}
      >
        <Label>State (controlled)</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {states.map((state) => (
              <ListBox.Item key={state.id} id={state.id} textValue={state.name}>
                {state.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <p className="text-sm text-muted">Selected: {selectedState?.name || "None"}</p>
    </div>
  );
}
```
