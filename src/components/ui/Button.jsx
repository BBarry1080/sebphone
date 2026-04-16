export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 cursor-pointer';

  const variants = {
    primary: 'bg-[#00B4CC] text-white hover:bg-[#009ab0] active:scale-95',
    secondary: 'bg-transparent border-2 border-[#00B4CC] text-[#00B4CC] hover:bg-[#00B4CC] hover:text-white active:scale-95',
    dark: 'bg-[#1B2A4A] text-white hover:bg-[#243660] active:scale-95',
    ghost: 'bg-transparent text-[#555555] hover:bg-[#F5F5F5] active:scale-95',
    danger: 'bg-[#EF4444] text-white hover:bg-red-600 active:scale-95',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-5 py-3 text-sm min-h-[48px]',
    lg: 'px-7 py-4 text-base min-h-[52px]',
    full: 'px-5 py-3 text-sm min-h-[48px] w-full',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
