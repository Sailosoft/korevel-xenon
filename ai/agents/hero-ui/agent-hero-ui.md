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
