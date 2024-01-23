import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ColDef, GridApi, GridOptions } from 'ag-grid-community';

import {
  AG_GRID_FOOTER_HEIGHT,
  AG_GRID_HEADER_HEIGHT,
  AG_GRID_HSCROLL_HEIGHT,
  AG_GRID_NO_ROW_HEIGHT,
  AG_GRID_PAGINATION_COUNT,
  AG_GRID_ROW_HEIGHT
} from "../grid-constants";
import { ViewColOfObjsComponent } from '../view-col-of-objs/view-col-of-objs.component';
import { ColOfObjsGridCellComponent } from '../col-of-objs-grid-cell/col-of-objs-grid-cell/col-of-objs-grid-cell.component';
import { FloatingFilterComponent } from '../grid-column-filter/floating-filter/floating-filter.component';
import { ColumnFilterComponent } from '../grid-column-filter/column-filter/column-filter.component';

@Component({
  selector: 'odp-view-collection-of-objects-grid',
  templateUrl: './view-collection-of-objects-grid.component.html',
  styleUrls: ['./view-collection-of-objects-grid.component.scss']
})
export class ViewCollectionOfObjectsGridComponent implements OnInit, OnChanges {
  @Input() definition: any;
  @Input() showIndexColumn: boolean = false;
  @Input() collectionFieldName: string;
  @Input() historyMode: 'new' | 'old' | false = false;
  @Input() oldValue?;
  @Input() newValue?;
  @Input() workflowDoc?;
  gridOptions: GridOptions;
  definitionList: Array<any> = [];
  gridApi: GridApi;
  hasPath: boolean;
  frameworkComponents: any;
  rowData: Array<any>;

  get gridStyle() {
    return {
      minHeight: (AG_GRID_HEADER_HEIGHT + AG_GRID_NO_ROW_HEIGHT + AG_GRID_HSCROLL_HEIGHT + AG_GRID_FOOTER_HEIGHT) + 'px',
      height: (
        AG_GRID_HEADER_HEIGHT
        + (!!this.definition && !!this.definition.value && !!this.definition.value.length ? (Math.min(this.definition.value.length, AG_GRID_PAGINATION_COUNT) * AG_GRID_ROW_HEIGHT) : AG_GRID_NO_ROW_HEIGHT)
        + AG_GRID_HSCROLL_HEIGHT
        + AG_GRID_FOOTER_HEIGHT
      ) + 'px'
    }
  }

  get hasFilters() {
    return !!this.gridApi && this.gridApi.isAnyFilterPresent()
  }

  constructor() { }

  ngOnInit() {
    if (this.definition.definition) {
      this.hasPath = true;
    }
    this.flattenDefinition(this.definitionList, this.definition.definition);
    this.rowData = this.getRowData();
    this.prepareTable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!!changes && !!changes['definition']) {
      this.rowData = this.getRowData();
    }
  }

  flattenDefinition(definitionList, definition, parent?) {
    if (definition) {
      definition.forEach(def => {
        const path = parent ? parent.path + '.' + def.key : def.key;
        const key = def.key;
        const camelCase = path.split('.').join(' ').split('#').join(' ').camelCase();
        const level = parent ? def.level + 1 : def.level;
        const value = def.value;
        const controlPath = parent ? parent.controlPath + '.' + def.key : def.key;
        def.controlPath = controlPath;
        const properties = def.properties;
        if (parent) {
          properties.name = parent.properties.name + '.' + properties.name;
        }
        if (def.type === 'Object' && !def.properties.schemaFree) {
          this.flattenDefinition(definitionList, def.definition, def);
        } else {
          definitionList.push({
            ...def,
            controlPath,
            dataKey: controlPath,
            path,
            key,
            camelCase,
            type: def.type,
            properties,
            level,
            value
          });
        }
      });
    }
  }

  afterViewItem() {
    this.gridApi && this.forceResizeColumns();
  }

  clearFilters() {
    this.gridApi.setFilterModel(null);
  }

  private prepareTable() {
    let columnDefs=[]
    this.frameworkComponents = {
      customCellRenderer: ColOfObjsGridCellComponent,
      actionColCellRenderer: ViewColOfObjsComponent,
      customColumnFilterComponent: ColumnFilterComponent,
      customFloatingFilterComponent: FloatingFilterComponent,
    };
     columnDefs = [
      ...(
        this.showIndexColumn && !this.historyMode
          ? [{
            headerName: '#',
            field: '__index',
            pinned: 'left',
            sortable: false,
          }]
          : []
      ),
      ...this.definitionList.map((definition) => ({
        headerName: !!definition.properties.label ? definition.properties.label : definition.properties.name,
        field: definition.controlPath,
        sortable: false,
        resizable: true,
        cellRenderer: 'customCellRenderer',
        cellRendererParams: {
          historyMode: this.historyMode
        },
        refData: definition,
        floatingFilter: true,
        minWidth: definition.type === 'Date' ? 162 : 80,
        // width: definition.type === 'Date' ? 162 : 80,
        flex: 2,
        onCellClicked: (params) => {
          if (definition.properties.richText || definition.properties.longText) {
            return this.onRowDoubleClick(params)

          }

          else {

            return

          }
        },
        onCellDoubleClicked: (params) => {
          if (definition.type === 'Array' || definition.type === 'Object' || definition.type === 'Geojson' || definition.properties.richText || definition.properties.longText) {
            return this.onRowDoubleClick(params)

          }

          else {

            return

          }
        },
        ...this.getFilterConfiguration(definition),
      })),
      {
        headerName: 'Action',
        cellRenderer: 'actionColCellRenderer',
        // maxWidth: 10,
        // width: 40,
        flex: 1,
        suppressToolPanel: true
      }
    ]
    this.gridOptions = {
      context: {
        gridParent: this
      },
      columnDefs,
      pagination: false,
      animateRows: true,
      onGridReady: this.onGridReady.bind(this),
      onRowDataUpdated: this.autoSizeAllColumns.bind(this),
      // onRowDoubleClicked: this.onRowDoubleClick.bind(this),
      // onGridSizeChanged: this.forceResizeColumns.bind(this),
      rowHeight: 46,
      headerHeight: this.historyMode ? 0 : 46,
      defaultColDef: {
        suppressMovable: true,
        suppressMenu: true
      },
      suppressColumnVirtualisation: true,
      suppressPaginationPanel: true,
      suppressHorizontalScroll: false,
      floatingFiltersHeight: this.historyMode ? 0 : 40
    };
  }

  private getRowData() {
    switch (this.historyMode) {
      case 'old':
        return this.oldValue;
      case 'new':
        return this.newValue;
      default:
        return !!this.definition && !!this.definition.value ? this.definition.value.map((obj, idx) => ({ ...obj, __index: idx + 1 })) : []
    }
  }

  private onGridReady(event) {
    this.gridApi = event.api;
    this.gridApi = event.gridApi;
    if (this.gridApi) {
      this.forceResizeColumns();
      this.gridApi.setFilterModel('');

    }
    // this.gridApi.sizeColumnsToFit()
    // this.gridApi.autoSizeAllColumns();
  }

  private forceResizeColumns() {
    this.gridApi.sizeColumnsToFit();
    this.autoSizeAllColumns();
  }

  private getFilterConfiguration(definition: any): Partial<ColDef> {
    const defaultFilterConf: Partial<ColDef> = {
      filterParams: {
        suppressAndOrCondition: true,
        suppressFilterButton: true,
      }
    }
    if (definition.type === 'Number') {
      return {
        filter: 'agNumberColumnFilter',
        floatingFilterComponent: 'customFloatingFilterComponent',
        ...defaultFilterConf
      }
    } else if (definition.type === 'String'
      && !definition.properties.longText
      && !definition.properties.richText
      && !definition.properties.password
      && !definition.properties.email
    ) {
      return {
        filter: 'agTextColumnFilter',
        floatingFilterComponent: 'customFloatingFilterComponent',
        ...defaultFilterConf
      };
    }
    return {
      filter: 'customColumnFilterComponent',
      floatingFilterComponent: 'customFloatingFilterComponent',
    }
  }

  private autoSizeAllColumns() {
    if (!!this.gridApi && !!this.gridApi) {
      setTimeout(() => {
        const container = document.querySelector('.grid-container');
        const availableWidth = !!container ? container.clientWidth - 80 : 900;
        const allColumns = this.gridApi.getColumns();
        allColumns.forEach(col => {
          this.gridApi.autoSizeColumn(col);
          if (col.getActualWidth() > 200 || this.gridApi.getDisplayedRowCount() === 0) {
            col.setActualWidth(200);
          }
        });
        const occupiedWidth = allColumns.reduce((pv, cv) => (pv + cv.getActualWidth()), -80);
        if (occupiedWidth < availableWidth) {
          this.gridApi.sizeColumnsToFit();
        }
      });
    }
  }

  private onRowDoubleClick(params: any) {
    const actionCol = params.gridApi.getColumns().find(col => col.getColDef().headerName === 'Action');
    const cellRendererInstances = params.api.getCellRendererInstances({ columns: [actionCol], rowNodes: [params.node] });
    if (!!cellRendererInstances && !!cellRendererInstances.length) {
      const crDom = cellRendererInstances[0].getGui();
      (crDom.querySelector('.viewBtn') as HTMLButtonElement).click();
    }
  }
}
