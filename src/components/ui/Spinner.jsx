export default function Spinner({ message = 'Chargement...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="animate-spin w-10 h-10 border-4 border-[#00B4CC] border-t-transparent rounded-full" />
      <p className="text-sm text-[#555555]">{message}</p>
    </div>
  );
}
