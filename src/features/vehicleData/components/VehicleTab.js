import Th from '@/components/table/Th';
import Td from '@/components/table/Td';
import { normalizeEmail } from '@/lib/utils';

export default function VehicleTab({ paginatedData, driverMap }) {
  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse min-w-4xl">
        <thead className="sticky top-0 z-10">
          <tr>
            <Th>Plat</Th>
            <Th>Type</Th>
            <Th>Email</Th>
            <Th>Name</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((v) => (
            <tr key={v._id} className="hover:bg-gray-50">
              <Td>{v.name}</Td>
              <Td>{v.tags?.[0] || null}</Td>
              <Td>{v.assignee}</Td>
              <Td>{driverMap.get(normalizeEmail(v.assignee)) || null}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
