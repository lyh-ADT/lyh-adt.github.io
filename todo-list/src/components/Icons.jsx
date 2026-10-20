function Icon({ size = 18, children, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </Icon>
  )
}

export function PlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function RefreshIcon(props) {
  return (
    <Icon {...props}>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.1 9a7 7 0 0 1 11.5-2.2L20 9M4 15l2.4 2.2A7 7 0 0 0 17.9 15" />
    </Icon>
  )
}

export function FolderIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.2c.7 0 1.3.3 1.8.8L12.5 7H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" />
    </Icon>
  )
}

export function FolderPlusIcon(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.2c.7 0 1.3.3 1.8.8L12.5 7H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" />
      <path d="M12 10.5v5M9.5 13h5" />
    </Icon>
  )
}

export function SearchIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  )
}

export function TrashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
      <path d="M10 11v5M14 11v5" />
    </Icon>
  )
}

export function ArrowLeftIcon(props) {
  return (
    <Icon {...props}>
      <path d="m14.5 5-7 7 7 7" />
    </Icon>
  )
}

export function ChevronDownIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}

export function CloseIcon(props) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  )
}

export function CalendarIcon(props) {
  return (
    <Icon {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </Icon>
  )
}

export function FileTextIcon(props) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h7l5 5v12H6a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M13 3.5v5h5M8.5 13h7M8.5 16.5h4.5" />
    </Icon>
  )
}

export function AlertIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 21 19H3L12 4.5Z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </Icon>
  )
}

export function InboxIcon(props) {
  return (
    <Icon {...props}>
      <path d="m4 13 2-8h12l2 8" />
      <path d="M4 13h5l1.5 2h3L15 13h5v5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V13Z" />
    </Icon>
  )
}

export function MoreIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </Icon>
  )
}

export function PencilIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" />
      <path d="m14.5 7.5 2 2" />
    </Icon>
  )
}

export function EyeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  )
}

export function UnplugIcon(props) {
  return (
    <Icon {...props}>
      <path d="M8 4v5M16 4v5M6.5 9h11v2.5a5.5 5.5 0 0 1-11 0V9ZM12 17v4" />
    </Icon>
  )
}

export function SparkIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3.5c.6 4.4 3.1 6.9 7.5 7.5-4.4.6-6.9 3.1-7.5 7.5-.6-4.4-3.1-6.9-7.5-7.5 4.4-.6 6.9-3.1 7.5-7.5Z" />
    </Icon>
  )
}

export function ArrowRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 12h15M14 6.5l5.5 5.5L14 17.5" />
    </Icon>
  )
}
