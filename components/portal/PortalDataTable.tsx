import { Children, cloneElement, isValidElement, type ReactNode, type TableHTMLAttributes, type TdHTMLAttributes } from "react";

type Props = TableHTMLAttributes<HTMLTableElement> & {
  columns: readonly string[];
  children: ReactNode;
};

/** One server-rendered table: rows become labelled cards on narrow screens. */
export default function PortalDataTable({ columns, children, className = "", ...props }: Props) {
  const rows = Children.map(children, (row) => {
    if (!isValidElement<{ children?: ReactNode; role?: string }>(row) || row.type !== "tr") return row;
    let column = 0;
    const cells = Children.map(row.props.children, (cell) => {
      if (!isValidElement<TdHTMLAttributes<HTMLTableCellElement>>(cell) || cell.type !== "td") return cell;
      const label = columns[column];
      column += cell.props.colSpan || 1;
      return cloneElement(cell, { role: "cell" }, <>
        {label ? <span className="portalTableCellLabel" aria-hidden="true">{label}</span> : null}
        <div className="portalTableCellValue">{cell.props.children}</div>
      </>);
    });
    return cloneElement(row, { role: "row" }, cells);
  });

  return (
    <table {...props} role="table" className={"portalDataTable portalResponsiveTable " + className}>
      <thead role="rowgroup"><tr role="row">
        {columns.map((label, index) => <th key={index} scope="col" role="columnheader">{label}</th>)}
      </tr></thead>
      <tbody role="rowgroup">{rows}</tbody>
    </table>
  );
}
