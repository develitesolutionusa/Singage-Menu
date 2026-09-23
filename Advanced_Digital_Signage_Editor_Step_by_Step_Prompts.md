# Advanced Digital Signage Template & Loop Design Editor

## Step-by-Step Implementation Prompts

**Implementation rule:** Run these prompts one at a time. After each
step, run the app, test the feature, fix issues, and only then continue.

Final workflow:

**Template Library → Industry Template → Use Template → Loop Slide →
Design Editor → Preview → Save → Publish → Player/Screen**

------------------------------------------------------------------------

# Step 0 --- Audit Existing Project

## Prompt

Before writing any code, audit the existing project architecture.

I want to add an Advanced Digital Signage Design Editor to the existing
application.

Inspect and identify:

-   Current Loop Editor
-   Loop data model
-   Loop slides/items
-   Timeline implementation
-   Existing media/library system
-   Template-related code
-   Organization system
-   User roles and permissions
-   Authentication
-   Database/schema
-   API/service layer
-   Player/Screen system
-   Preview system
-   Publishing flow
-   Existing UI component system
-   Existing design system

Do NOT modify code yet.

Create a concise implementation plan showing:

1.  Reusable existing components
2.  Components that need modification
3.  New components required
4.  Database model changes
5.  API changes
6.  How Template → Loop → Design Editor → Player should connect

Do not create duplicate systems. Do not replace or break the existing
Loop Editor. Use the existing technology stack.

Wait after providing the audit and plan.

------------------------------------------------------------------------

# Step 1 --- Build Industry Template Library

## Prompt

Implement the Template Library as a real functional feature.

Do not build the Design Editor yet.

Create a premium SaaS Template Library with:

-   Dark application sidebar
-   Search
-   Industry filter
-   Category filter
-   Template cards
-   Template thumbnails
-   Template name
-   Industry
-   Category/type
-   Tags
-   Favorite
-   Use Template

Industries:

-   Restaurant & Food
-   Retail
-   Healthcare
-   Education
-   Hospitality
-   Corporate
-   Real Estate
-   Fitness
-   Automotive
-   Custom

Restaurant & Food starter templates:

-   Restaurant Menu
-   Food Promotion
-   Daily Special
-   Happy Hour
-   Breakfast Menu
-   Seasonal Offer
-   Lunch Deal
-   New Item
-   Combo Promotion

Use Template must provide:

-   Add to Existing Loop
-   Create New Loop

Use the existing database, authentication, organization and UI systems.

Test search, filters, preview, favorites, use template, existing Loop
integration and new Loop creation.

Do not implement the visual Design Editor yet.

------------------------------------------------------------------------

# Step 2 --- Connect Templates to Loops

## Prompt

Connect the Template Library to the existing Loop system.

Workflow:

**Template Library → Select Template → Use Template → Select/Create Loop
→ Template becomes a Loop Slide**

Do NOT replace the existing Loop Editor.

Keep:

-   Loop name
-   Orientation
-   Timeline
-   Media
-   Duration
-   Reordering
-   Preview
-   Save

Recommended relationship:

**Template → Template Instance → Loop Slide → Loop → Player → Screen**

Each Loop Slide should store/reference:

-   loopId
-   templateId
-   templateVersion
-   order
-   duration
-   contentData
-   overrides
-   publish status

Add:

**Timeline \| Design Editor**

Timeline remains the current editor.

Do not duplicate the full template structure unnecessarily.

Test adding templates to existing/new Loops and ensure existing Loop
functionality remains intact.

------------------------------------------------------------------------

# Step 3 --- Build Design Editor UI Shell

## Prompt

Build the Advanced Design Editor UI inside the existing Loop Editor
using the provided reference screenshot as the primary visual reference.

Do not implement advanced functionality yet.

Top toolbar:

-   Back
-   Template/Slide name
-   Orientation
-   Timeline
-   Design Editor
-   Preview
-   Save
-   Publish
-   Auto-save status
-   Undo
-   Redo

Main layout:

**LEFT:** Templates / Blocks\
**CENTER:** Design Canvas\
**RIGHT:** Properties / Settings

Left tabs:

**Templates \| Blocks**

Templates:

-   Search
-   Industry
-   Categories
-   Recently Used
-   Popular Templates
-   Template thumbnails

Blocks:

-   Text
-   Image
-   Video
-   Menu Card
-   Button
-   Shape
-   QR Code
-   Logo
-   Social Icons
-   Divider
-   Dynamic Data
-   Price Badge
-   Promotion Card
-   Contact
-   Hours
-   Location

Center:

-   Landscape canvas
-   Correct aspect ratio
-   Zoom
-   Grid
-   Canvas background
-   Selection state
-   Empty state

Right tabs:

**Content \| Style \| Advanced**

Bottom toolbar:

-   Layers
-   Lock
-   Duplicate
-   Delete
-   Undo
-   Redo
-   Zoom Out
-   Zoom %
-   Zoom In
-   Fit

Match the reference style: premium SaaS, light workspace, dark sidebar,
blue actions, subtle borders, rounded panels and clear hierarchy.

Build real reusable components, not a static screenshot.

Do not implement drag/drop yet.

------------------------------------------------------------------------

# Step 4 --- Build Functional Drag & Drop Canvas

## Prompt

Make the Design Editor canvas functional without redesigning the
previous UI.

Implement:

-   Select
-   Drag
-   Resize
-   Move
-   Delete
-   Duplicate
-   Multi-select
-   Bounding box
-   Resize handles
-   Alignment guides
-   Snap-to-grid
-   Canvas boundaries
-   Zoom
-   Pan

Blocks from the left panel must be draggable onto the canvas.

Support:

-   Text
-   Image
-   Video
-   Menu Card
-   Button
-   Shape
-   QR Code
-   Logo
-   Divider
-   Dynamic Data
-   Price Badge
-   Promotion Card

On drop:

1.  Create the element
2.  Assign an element ID
3.  Position it
4.  Select it
5.  Show its properties

Context toolbar:

-   Move
-   Duplicate
-   Lock
-   Hide
-   Delete
-   More

Keyboard shortcuts:

-   Delete
-   Ctrl/Cmd+C
-   Ctrl/Cmd+V
-   Ctrl/Cmd+D
-   Ctrl/Cmd+Z
-   Ctrl/Cmd+Shift+Z
-   Arrow movement

Store element positions as data, not hardcoded CSS.

Test drag/drop, resize, duplicate, delete, undo and redo.

------------------------------------------------------------------------

# Step 5 --- Implement Smart Template System

## Prompt

Implement the Smart Template system.

This must NOT behave like a generic blank Canva editor.

Templates should be professionally pre-designed and contain editable
content fields.

Template structure should define:

-   Layout
-   Elements
-   Typography
-   Colors
-   Sections
-   Images/placeholders
-   Buttons
-   Branding
-   Editable fields
-   Default values
-   Positioning
-   Responsive behavior

Show:

**🔒 Smart Template**

-   Layout protected
-   Content editable
-   Changes sync automatically

Manager mode allows:

-   Text
-   Images
-   Prices
-   Descriptions
-   Logo
-   CTA
-   Dynamic fields

Managers cannot change structural layout without permission.

Example Restaurant template fields:

-   Title
-   Product
-   Description
-   Price
-   Image
-   CTA

Changing fields must immediately update the canvas.

Build a reusable schema-driven Smart Template system rather than
separate custom code per template.

------------------------------------------------------------------------

# Step 6 --- Build Dynamic Properties Panel

## Prompt

Make the right Properties Panel fully functional.

Tabs:

**Content \| Style \| Advanced**

Content controls should change based on the selected element.

Text:

-   Text
-   Font
-   Alignment

Image:

-   Image
-   Alt text
-   Fit mode

Menu/Product:

-   Name
-   Description
-   Price
-   Image
-   Category
-   CTA
-   Featured

Button:

-   Label
-   URL
-   Action

Dynamic Data:

-   Data source
-   Field
-   Fallback value

Style:

-   Font family
-   Font size
-   Font weight
-   Text color
-   Background
-   Border
-   Radius
-   Shadow
-   Opacity
-   Alignment
-   Line height
-   Letter spacing
-   Padding
-   Margin

Advanced:

-   X
-   Y
-   Width
-   Height
-   Rotation
-   Layer
-   Visibility
-   Animation
-   Entrance animation
-   Exit animation
-   Duration
-   Device behavior
-   Lock

All changes must update the canvas in real time without reloading.

------------------------------------------------------------------------

# Step 7 --- Implement Layers System

## Prompt

Implement a professional Layers system.

Example:

-   Logo
-   Title
-   Description
-   Food Image
-   Price
-   CTA Button
-   Background
-   Decorations

Support:

-   Select
-   Rename
-   Hide/Show
-   Lock/Unlock
-   Drag to reorder
-   Bring Forward
-   Send Backward
-   Bring to Front
-   Send to Back

Selecting a layer selects the canvas element.

Selecting a canvas element highlights its layer.

Persist layer order in the design data.

------------------------------------------------------------------------

# Step 8 --- Implement Layout Locking and Permissions

## Prompt

Implement Smart Template permissions.

Default:

**Layout locked. Content editable.**

Show:

**🔓 Unlock Layout**

Only users with the appropriate existing permission can unlock it.

Suggested permissions:

-   View Templates
-   Use Templates
-   Edit Content
-   Edit Design
-   Unlock Layout
-   Create Templates
-   Edit Templates
-   Delete Templates
-   Publish

When unlocked, enable:

-   Move
-   Resize
-   Delete structural elements
-   Add blocks
-   Change layout
-   Full drag/drop

When locked, structural elements cannot be modified.

Enforce authorization in the backend/API as well as the UI.

------------------------------------------------------------------------

# Step 9 --- Implement Dynamic Data Binding

## Prompt

Implement dynamic data binding for Smart Templates.

Support:

``` text
{{product.name}}
{{product.price}}
{{product.description}}
{{product.image}}
{{restaurant.name}}
{{restaurant.logo}}
```

Connect dynamic fields to the application's real data sources where
available.

Example:

If product price changes from \$14.99 to \$16.99, every linked design
using that dynamic price should render \$16.99 automatically.

Editor UX should show:

-   Data Source
-   Field
-   Fallback Value

Clearly indicate dynamic fields.

Support:

-   Dynamic text
-   Dynamic price
-   Dynamic image
-   Dynamic logo
-   Dynamic business information

Do not break manually editable fields.

------------------------------------------------------------------------

# Step 10 --- Implement Preview Mode

## Prompt

Implement a professional Preview mode.

Preview must use the actual saved design renderer.

Support:

-   Full screen
-   Landscape
-   Portrait
-   Different resolutions
-   Animation playback
-   Previous slide
-   Next slide
-   Play
-   Pause

When previewing a Loop, show the actual Loop sequence.

The preview should match the connected digital signage player as closely
as possible.

Add:

-   Close Preview
-   Back to Editor

Reuse the existing player renderer where possible instead of creating a
duplicate rendering system.

------------------------------------------------------------------------

# Step 11 --- Implement Save, Auto-Save and Drafts

## Prompt

Implement reliable persistence.

Auto-save editor changes and display:

**✓ Auto-saved**

with last saved time.

Support:

-   Save Draft
-   Unsaved Changes confirmation
-   Undo
-   Redo

Do not store every history state as a separate database record.

Refreshing the page must not lose saved changes.

Test:

-   Text changes
-   Position changes
-   Style changes
-   Layer changes
-   Added blocks
-   Deleted blocks
-   Template changes

------------------------------------------------------------------------

# Step 12 --- Connect Editor to Publish System

## Prompt

Connect the Design Editor to the existing Loop publishing system.

Publish flow:

**Design Editor → Save → Validate → Publish → Update Loop → Player
receives updated Loop → Screen displays updated design**

Show statuses:

-   Draft
-   Saved
-   Publishing...
-   Published
-   Publish Failed

Before publishing validate:

-   Required fields
-   Broken images
-   Invalid dynamic data
-   Missing template data
-   Invalid dimensions
-   Missing required content

Use the existing player/screen publishing infrastructure.

Do not create a separate publishing mechanism if one already exists.

------------------------------------------------------------------------

# Step 13 --- Implement Template Versioning

## Prompt

Implement safe template versioning.

Every template should have a version:

-   Template v1
-   Template v2
-   Template v3

When a master template changes, existing Loop instances must not
silently break.

Provide:

-   Update to Latest Template
-   Keep Current Version
-   Detach from Template

Before updating a Loop instance, show what will change.

Preserve content overrides where possible.

Never overwrite user-specific content without confirmation.

------------------------------------------------------------------------

# Step 14 --- Production Polish and QA

## Prompt

Perform a complete production-quality review of the Template + Loop +
Design Editor system.

Do not add unrelated features.

Verify Template Library:

-   Industries
-   Search
-   Filters
-   Template preview
-   Favorites
-   Use Template

Verify Loop:

-   Existing timeline still works
-   Template slides work
-   Reordering works
-   Duration works
-   Preview works

Verify Design Editor:

-   Drag/drop
-   Move
-   Resize
-   Duplicate
-   Delete
-   Layers
-   Lock
-   Unlock
-   Undo
-   Redo
-   Zoom
-   Pan
-   Snap
-   Properties
-   Dynamic data

Verify Smart Templates:

-   Content editing
-   Protected layout
-   Permissions
-   Unlock Layout

Verify persistence:

-   Auto-save
-   Save Draft
-   Reload persistence
-   Unsaved changes

Verify publishing:

-   Validation
-   Publish
-   Player sync
-   Screen output

UX review:

-   No unnecessary complexity
-   No broken states
-   No overlapping panels
-   No inconsistent spacing
-   No confusing controls
-   No dead buttons
-   No fake functionality
-   Loading states
-   Empty states
-   Error states
-   Success feedback
-   Responsive editor layout

Performance review:

-   Large templates
-   Many layers
-   Multiple images
-   Video elements
-   Frequent property changes
-   Undo/redo history

Avoid unnecessary re-renders.

Final requirement:

The result must feel like a purpose-built **Digital Signage Smart
Template + Loop Design Editor**, not a generic Canva clone.

Preserve all existing application functionality.

------------------------------------------------------------------------

# Final Architecture

``` text
Template Library
│
├── Industry Categories
│   ├── Restaurant & Food
│   ├── Retail
│   ├── Healthcare
│   ├── Education
│   ├── Hospitality
│   ├── Corporate
│   ├── Real Estate
│   ├── Fitness
│   ├── Automotive
│   └── Custom
│
└── Template
    │
    ├── Preview
    ├── Use Template
    └── Add to Loop
            │
            ▼
          Loop
            │
            ├── Timeline
            │
            └── Design Editor
                    │
                    ├── Templates
                    ├── Blocks
                    ├── Canvas
                    ├── Layers
                    ├── Content
                    ├── Style
                    ├── Advanced
                    ├── Dynamic Data
                    └── Preview
                            │
                            ▼
                         Publish
                            │
                            ▼
                         Player
                            │
                            ▼
                         Screen
```

# Recommended Data Architecture

``` text
Template
├── id
├── name
├── industry
├── category
├── thumbnail
├── version
├── schema
├── defaultData
└── permissions

Loop
├── id
├── name
├── orientation
└── slides[]

LoopSlide
├── id
├── loopId
├── templateId
├── templateVersion
├── contentData
├── overrides
├── duration
├── order
└── status
```

# Core Product Philosophy

1.  Professionally designed templates first.
2.  Smart editable content second.
3.  Drag & Drop when more control is needed.
4.  Advanced layout editing only for authorized users.
5.  Loop integration and publishing stay in the same workflow.
6.  The editor should be powerful without becoming difficult for
    Managers.
