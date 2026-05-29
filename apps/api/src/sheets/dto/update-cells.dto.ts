export class UpdateCellsDto {
  cells: {
    rowIndex: number;
    colIndex: number;
    value: any;
  }[];
}
