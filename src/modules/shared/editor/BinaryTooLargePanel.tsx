type Props = {
  name: string;
  size: number;
};

export function BinaryTooLargePanel({ name, size }: Props) {
  return (
    <div className="border border-base-300 rounded-md p-4 bg-base-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Binary secret (content hidden)</div>
          <div className="text-sm opacity-80 mt-1">
            <span className="mr-3">Name: {name}</span>
            <span>Size: {(size / 1024).toFixed(2)} KB</span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs opacity-70">
        This binary is larger than 50KB, so content is not displayed.
      </div>
    </div>
  );
}

export default BinaryTooLargePanel;


