import { Routes } from '@angular/router';

import { CheckboxComponent } from './components/checkbox/checkbox.component';
import { ChipFieldComponent } from './components/chip-field/chip-field.component';
import { DatepickerComponent } from './components/datepicker/datepicker.component';
import { RadioComponent } from './components/radio/radio.component';
import { SearchComponent } from './components/search/search.component';
import { SelectComponent } from './components/select/select.component';
import { SliderComponent } from './components/slider/slider.component';
import { TextFieldComponent } from './components/text-field/text-field.component';
import { TypeaheadComponent } from './components/typeahead/typeahead.component';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';

export const routes: Routes = [
  { path: '', redirectTo: 'checkbox', pathMatch: 'full' },
  { path: 'checkbox', component: CheckboxComponent },
  { path: 'chip-field', component: ChipFieldComponent },
  { path: 'datepicker', component: DatepickerComponent },
  { path: 'radio', component: RadioComponent },
  { path: 'search', component: SearchComponent },
  { path: 'select', component: SelectComponent },
  { path: 'slider', component: SliderComponent },
  { path: 'text-field', component: TextFieldComponent },
  { path: 'typeahead', component: TypeaheadComponent },
  { path: 'tab-bar', component: TabBarComponent }
];
