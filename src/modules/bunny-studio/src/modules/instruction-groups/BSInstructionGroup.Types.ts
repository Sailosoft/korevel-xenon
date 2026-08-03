// BSInstructionGroup.Types — Types for Bunny AI Studio Instruction Groups
//
// Instruction groups organize saved custom instructions (feature: Custom
// Instructions). A group is optional — instructions can exist without one.

export interface BSInstructionGroup {
  /** uuidv7 primary key */
  id: string;
  /** display name */
  name: string;
  /** optional description */
  description?: string;
  /** ISO datetime string */
  createdDate: string;
}

/** Form shape used when creating/editing an instruction group */
export type BSInstructionGroupForm = Omit<
  BSInstructionGroup,
  "id" | "createdDate"
>;
