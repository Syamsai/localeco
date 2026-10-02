export default function BrandMark({ className = "h-8 w-8" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 40 40"
    >
      <path
        d="M31.8 7.2C20.1 7.4 10.7 12.6 8.5 21.5c-1.5 6 2.5 10.9 8.5 10.9 10.7 0 15.9-11.5 14.8-25.2Z"
        fill="currentColor"
      />
      <path
        d="M8.5 33c4.8-8.4 10.4-13.8 18.7-18.4"
        stroke="#F6F8F3"
        strokeLinecap="round"
        strokeWidth="2.7"
      />
    </svg>
  );
}
