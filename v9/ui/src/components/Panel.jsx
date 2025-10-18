import BaseComponent from './base/BaseComponent';

const Panel = ({ title, children, style = {}, headerStyle = {}, contentStyle = {}, ...props }) => (
  <BaseComponent
    title={title}
    style={style}
    headerStyle={headerStyle}
    contentStyle={contentStyle}
    {...props}
  >
    {children}
  </BaseComponent>
);

export default Panel;
