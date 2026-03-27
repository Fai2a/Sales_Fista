'use client';

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  return (
    <button
      className="text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
      onClick={() =>
        fetch(`/api/leads/${leadId}`, { method: 'DELETE' }).then(() =>
          window.location.reload()
        )
      }
    >
      Delete
    </button>
  );
}
