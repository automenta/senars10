// ui/shared/platform/cli.js
import React from 'react';

export const h = React.createElement;
export const PLATFORM = 'cli';
export const Box = (function() {
  const { createBlessedComponent } = require('react-blessed');
  return createBlessedComponent('box');
})();
export const Text = (function() {
  const { createBlessedComponent } = require('react-blessed');
  return createBlessedComponent('text');
})();
export const Button = (function() {
  const { createBlessedComponent } = require('react-blessed');
  return createBlessedComponent('button');
})();
export const Grid = (function() {
  const { createBlessedComponent } = require('react-blessed');
  return createBlessedComponent('table');
})();
export const Tabs = (function() {
  const { createBlessedComponent } = require('react-blessed');
  return createBlessedComponent('listbar');
})();
export const Modal = (function() {
  const { createBlessedComponent } = require('react-blessed');
  return createBlessedComponent('box');
})();
export const eventMap = (event) => (event === 'onPress' ? 'onPress' : event);