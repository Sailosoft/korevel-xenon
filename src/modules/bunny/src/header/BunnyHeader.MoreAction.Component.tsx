"use client";

import React, { useCallback } from "react";
import { Dropdown, Button, Label } from "@heroui/react";
import { MoreVerticalIcon } from "lucide-react";
import { BunnyHeaderAction } from "./BunnyHeader.Interface"; // Adjust path if necessary
import { useBunnyKernel } from "../kernel";

interface BunnyHeaderMoreActionProps {
  actions: BunnyHeaderAction[];
}

export default function BunnyHeaderMoreAction({
  actions,
}: BunnyHeaderMoreActionProps) {
  if (!actions || actions.length === 0) return null;

  const kernel = useBunnyKernel();

  const handleAction = useCallback(
    (key: React.Key) => {
      const clickedAction = actions.find((action, index) => {
        const actionId = action.id || `overflow-${index}`;
        return actionId === key;
      });

      if (clickedAction && clickedAction.onClick && !clickedAction.disable) {
        clickedAction.onClick(kernel);
      }
    },
    [actions, kernel],
  );

  return (
    <Dropdown>
      <Button aria-label="More options" variant="tertiary">
        <MoreVerticalIcon className="size-4 shrink-0" />
        <span className="hidden sm:inline ml-1">Actions</span>
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={handleAction}>
          {actions.map((action, index) => {
            const actionId = action.id || `overflow-${index}`;
            const isDanger =
              action.variant === "danger" || action.variant === "danger-soft";

            return (
              <Dropdown.Item
                key={actionId}
                id={actionId}
                textValue={action.label}
                variant={isDanger ? "danger" : "default"}
              >
                {/* Fallback to custom render function if explicitly provided */}
                {action.render ? (
                  action.render()
                ) : (
                  <>
                    {action.icon}

                    {/* Native Label wrapper */}
                    <Label>{action.label}</Label>
                  </>
                )}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
