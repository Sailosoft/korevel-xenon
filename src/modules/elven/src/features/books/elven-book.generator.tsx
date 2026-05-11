import {
  Button,
  Card,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Select,
  TextArea,
} from "@heroui/react";
import { ElvenStack } from "../../components/elven.stack";
import { ElvenTypography } from "../../components/elven.typography";
import { Eye, Search, Sparkles } from "lucide-react";

export default function ElvenBookGenerator() {
  const existingBooks = [
    { label: "The Great Gatsby", value: "gatsby" },
    { label: "1984", value: "1984" },
  ];

  return (
    /* FIX: Changed min-w to max-w and added w-full for mobile compatibility */
    <div className="w-full max-w-[1400px] mx-auto space-y-10 p-6 text-foreground">
      <Card className="p-6 border-none shadow-sm bg-content1">
        <ElvenStack direction="column" gap={4}>
          <div className="flex items-center gap-2">
            <Search size={20} className="text-primary" />
            <ElvenTypography variant="title-medium">
              Continue Editing
            </ElvenTypography>
          </div>
          <Select
            placeholder="Select an existing book to load settings"
            variant="primary"
            className="w-full max-w-md" /* Ensured select isn't too wide on desktop */
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {existingBooks.map((book) => (
                  <ListBoxItem key={book.value} textValue={book.value}>
                    {book.label}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </ElvenStack>
      </Card>

      <Card className="p-8 border-none shadow-md">
        <ElvenStack direction="column" gap={6} alignItems="stretch">
          {/* Header */}
          <ElvenStack
            direction="row"
            gap={2}
            justifyContent="between"
            alignItems="center"
            className="border-b pb-4"
          >
            <div>
              <ElvenTypography variant="title-large" className="text-primary">
                Book Generator
              </ElvenTypography>
              <ElvenTypography
                variant="body-small"
                className="text-muted-foreground"
              >
                Configure your manuscript details and AI parameters
              </ElvenTypography>
            </div>
            {/* Added md:flex hidden/visible logic if you wanted button scaling, 
                but keeping ghost variant as requested */}
            <Button
              variant="outline"
              className="bg-blue-500 text-white border-blue-500"
            >
              <Sparkles size={18} />
              Generate Book
            </Button>
          </ElvenStack>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Title Input */}
            <div className="space-y-2">
              <Label className="font-semibold">Book Title</Label>
              <Input
                variant="secondary"
                placeholder="e.g. The Chronicles of Elven"
                className="w-full"
              />
            </div>

            {/* Author Input with Action Buttons */}
            <div className="space-y-2">
              <Label className="font-semibold">Author</Label>
              <ElvenStack direction="row" gap={2}>
                <Input
                  variant="primary"
                  placeholder="Enter author name"
                  className="w-full"
                />
                <Button variant="outline" isIconOnly>
                  <Eye size={18} />
                </Button>
              </ElvenStack>
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-2">
            <Label className="font-semibold">Book Description / Synopsis</Label>
            <TextArea
              variant="primary"
              placeholder="Describe the plot, setting, and tone..."
              /* Changed minLength to rows for actual visual space */
              rows={6}
              className="w-full"
            />
            <p className="text-[12px] text-muted-foreground">
              This description will be used by the AI to set the context for the
              generation.
            </p>
          </div>
        </ElvenStack>
      </Card>
    </div>
  );
}
