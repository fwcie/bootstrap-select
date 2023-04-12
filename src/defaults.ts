import { classNames, DefaultWhitelist } from './constants';

export const DEFAULTS = {
  noneSelectedText: 'Nothing selected',
  noneResultsText: 'No results matched {0}',
  countSelectedText(numSelected: number, _numTotal: number) {
    return numSelected == 1 ? '{0} item selected' : '{0} items selected';
  },
  maxOptionsText(numAll: number, numGroup: number) {
    return [
      numAll == 1 ? 'Limit reached ({n} item max)' : 'Limit reached ({n} items max)',
      numGroup == 1 ? 'Group limit reached ({n} item max)' : 'Group limit reached ({n} items max)'
    ];
  },
  selectAllText: 'Select All',
  deselectAllText: 'Deselect All',
  source: {
    pageSize: 40
  },
  chunkSize: 40,
  doneButton: false,
  doneButtonText: 'Close',
  multipleSeparator: ', ',
  styleBase: 'btn',
  style: classNames.BUTTONCLASS,
  size: 'auto',
  title: null,
  placeholder: null,
  allowClear: false,
  selectedTextFormat: 'values',
  width: false,
  container: false,
  hideDisabled: false,
  showSubtext: false,
  showIcon: true,
  showContent: true,
  dropupAuto: true,
  header: false,
  liveSearch: false,
  liveSearchPlaceholder: null,
  liveSearchNormalize: false,
  liveSearchStyle: 'contains',
  actionsBox: false,
  iconBase: classNames.ICONBASE,
  tickIcon: classNames.TICKICON,
  showTick: false,
  template: {
    caret: '<span class="caret"></span>'
  },
  maxOptions: false,
  mobile: false,
  selectOnTab: true,
  dropdownAlignRight: false,
  windowPadding: 0,
  virtualScroll: 600,
  display: false,
  sanitize: true,
  sanitizeFn: null,
  whiteList: DefaultWhitelist
};
