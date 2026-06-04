import { ShieldX } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-200 mb-2">غير مصرح</h2>
      <p className="text-slate-400 text-sm">ليس لديك صلاحية للوصول لهذه الصفحة</p>
    </div>
  );
}
