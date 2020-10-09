import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { AgGridColumn } from 'ag-grid-angular';
import * as _ from 'lodash';

import { CommonService } from 'src/app/service/common.service';
import { ValueRendererComponent } from '../value-renderer/value-renderer.component';

@Component({
  selector: 'odp-error-records',
  templateUrl: './error-records.component.html',
  styleUrls: ['./error-records.component.scss']
})
export class ErrorRecordsComponent implements OnInit {

  @Input() toggle: boolean;
  @Output() toggleChange: EventEmitter<boolean>;
  @Input() schema: any;
  @Input() transfersData: any;
  subscriptions: any;
  apiCalls: any;
  columnDef: AgGridColumn[];
  errorRecords: Array<any>;
  api: string;
  constructor(private commonService: CommonService) {
    const self = this;
    self.toggleChange = new EventEmitter();
    self.subscriptions = {};
    self.apiCalls = {};
    self.errorRecords = [];
  }

  ngOnInit() {
    const self = this;
    self.api = '/' + self.schema.app + self.schema.api;
    self.importErrorRecords();
  }


  fixSchema(parsedDef) {
    const self =this;
    Object.keys(parsedDef).forEach(key => {
      if (parsedDef[key].properties && parsedDef[key].properties.relatedTo) {
        parsedDef[key].type = 'Relation';
        parsedDef[key].properties._typeChanged = 'Relation';
        delete parsedDef[key].definition;
      } else if (parsedDef[key].properties && parsedDef[key].properties.password) {
        parsedDef[key].type = 'String';
        parsedDef[key].properties._typeChanged = 'String';
        delete parsedDef[key].definition;
      } else if (parsedDef[key].type === 'Array') {
        self.fixSchema(parsedDef[key].definition);
      } else if (parsedDef[key].type === 'Object') {
        self.fixSchema(parsedDef[key].definition);
      }
    });
  }

  importErrorRecords() {
    const self = this;
    self.apiCalls.importErrorRecords = true;
    const opt = {
      filter: { status: 'Error' },
      count: -1
    };
    self.subscriptions['importErrorRecords'] = self.commonService
      .get('api', self.api + '/fileMapper/' + self.transfersData.fileId, opt)
      .subscribe(res => {
        self.apiCalls.importErrorRecords = false;
        self.errorRecords = res;
        self.errorRecords = self.errorRecords.sort((a, b) => {
          if (a.sNo > b.sNo) {
            return 1;
          } else if (a.sNo < b.sNo) {
            return -1;
          } else {
            return 0;
          }
        });
        let definition = self.schema.definition;
        if (typeof definition === 'string') {
          definition = JSON.parse(definition);
        }
        self.fixSchema(definition);
        self.populateMetaColumns();
        self.columnDef = self.columnDef.concat(self.parseDefinition(definition));
      }, err => {
        self.apiCalls.importErrorRecords = false;
        self.commonService.errorToast(err, 'Unable to get the records,please try again later');
      });
  }

  populateMetaColumns() {
    const self = this;
    self.columnDef = [];
    const col1 = new AgGridColumn();
    col1.field = 'sNo';
    col1.headerName = 'Sheet Row No.';
    col1.width = 120;
    col1.resizable = true;
    col1.cellRendererFramework = ValueRendererComponent;
    self.columnDef.push(col1);
    const col2 = new AgGridColumn();
    col2.field = 'errorMessage';
    col2.headerName = 'Error Message';
    col2.cellRendererFramework = ValueRendererComponent;
    col2.width = 240;
    col2.resizable = true;
    self.columnDef.push(col2);
  }

  parseDefinition(definition: any, parentKey?: string, parentName?: string): AgGridColumn[] {
    const self = this;
    let columns: AgGridColumn[] = [];
    if (definition) {
      Object.keys(definition).forEach(key => {
        const def = definition[key];
        const col = new AgGridColumn();
        const dataKey = parentKey ? parentKey + '.' + key : key;
        let dataName;
        if (def.properties.label) {
          dataName = parentName ? parentName + '.' + def.properties.label : def.properties.label;
        } else {
          dataName = parentName ? parentName + '.' + def.properties.name : def.properties.name;
        }
        if (def.properties && def.properties.password) {
          col.field = 'data.' + dataKey + '.value';
        } else {
          col.field = 'data.' + dataKey;
        }
        col.headerName = dataName;
        col.refData = def;
        col.width = 200;
        col.resizable = true;
        col.cellRendererFramework = ValueRendererComponent;
        if (def.type === 'Object') {
          columns = columns.concat(self.parseDefinition(def.definition, dataKey, dataName));
        } else {
          columns.push(col);
        }
      });
    }
    return columns;
  }

  done() {
    const self = this;
    self.toggle = false;
    self.toggleChange.emit(self.toggle);
  }

  get apiCallsPending() {
    const self = this;
    if (Object.values(self.apiCalls).length > 0) {
      return Object.values(self.apiCalls).every(e => e);
    }
    return false;
  }

}
