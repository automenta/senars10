// ui/shared/platform/web.js
import React from 'react';

export const h = React.createElement;
export const PLATFORM = 'web';
export const eventMap = (event) => (event === 'onPress' ? 'onClick' : event);
export const Box = 'div';
export const Text = 'span';
export const Button = 'button';
export const Grid = 'div'; // styled as CSS grid
export const Tabs = 'nav';
export const Modal = 'dialog';