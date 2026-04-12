import React from 'react';
import { FileText, Image as ImageIcon, Table, FileSearch, Plus, Trash2 } from 'lucide-react';
import { VaultItem, VaultItemType } from '../types';

interface VaultProps {
  items: VaultItem[];
  onAddItem: (item: Omit<VaultItem, 'id' | 'addedAt'>) => void;
  color: string;
}

const getIcon = (type: VaultItemType) => {
  switch (type) {
    case 'pdf': return <FileText size={18} />;
    case 'image': return <ImageIcon size={18} />;
    case 'table': return <Table size={18} />;
    case 'text': return <FileSearch size={18} />;
    case 'report': return <FileSearch size={18} />;
    default: return <FileText size={18} />;
  }
};

export const Vault: React.FC<VaultProps> = ({ items, onAddItem, color }) => {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="w-2 h-6 rounded-full" style={{ backgroundColor: color }} />
          خزانة الملف
        </h3>
        <button 
          onClick={() => onAddItem({ name: 'مورد جديد', type: 'text', content: '' })}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <FileSearch size={32} className="text-gray-300" />
            <p className="text-sm text-gray-400 font-medium">الخزانة فارغة، أضف موارد لإثراء الملف</p>
          </div>
        ) : (
          items.map((item) => (
            <div 
              key={item.id}
              className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-gray-50 text-gray-500 group-hover:bg-white group-hover:text-gray-900 transition-colors">
                {getIcon(item.type)}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-bold text-gray-700 truncate">{item.name}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{item.type} • {new Date(item.addedAt).toLocaleDateString('ar-EG')}</span>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-300 transition-all">
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-[11px] text-gray-500 leading-relaxed italic">
          "هذه الخزانة هي أصل موضوع الملف، كل ما تضعه هنا يحلله سيد رمضان لبناء رؤية شاملة لمسارك."
        </p>
      </div>
    </div>
  );
};
