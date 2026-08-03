// BSInstruction.Types — Types for Bunny AI Studio Instructions
//
// A saved custom instruction that can be prefilled into the chat "instruction"
// input. Instructions optionally belong to an InstructionGroup; when no group
// is selected the user can still pick any instruction (feature: Custom
// Instructions).

export interface BSInstruction {
  /** uuidv7 primary key */
  id: string;
  /** display title */
  title: string;
  /** the instruction content prefilled into the chat */
  content: string;
  /** optional owning instruction group id */
  instructionGroupId?: string;
  /** ISO datetime string */
  createdDate: string;
}

/** Form shape used when creating/editing an instruction */
export type BSInstructionForm = Omit<BSInstruction, "id" | "createdDate">;
