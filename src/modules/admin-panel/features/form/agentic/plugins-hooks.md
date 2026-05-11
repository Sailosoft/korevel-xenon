# AdminPanelFormPlugin

## Reference

```typescript
export interface AdminPanelFormPlugin<T = any> {
  onSuccess?: (data: T, mode: AdminPanelFormMode) => void;
  onError?: (error: Error, mode: AdminPanelFormMode) => void;
  onBeforeSubmit?: (data: T, mode: AdminPanelFormMode) => T | Promise<T>;
  onAfterSubmit?: (data: T | undefined, mode: AdminPanelFormMode) => void;
}
```

s

## Plugins

### AdminPanelModalPlugin

#### Actions

#### onSuccess

- Access UseAdminPanelNotify that method are success
- Close Modal
- Reload Table Data with current query option(
  The will remain seen
  ) if the mode is created it should remove current queryoption

#### onError

- Access UseAdminPanelNotify that method are failure

#### onBeforeSubmit

- Access FormData to Modify before submit or do actions

#### onAfterSubmit

- After submit regardless of success or not
