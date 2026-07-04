// Renders <DeploymentMethods /> in docs/deployment.md without editing the
// markdown itself, which gets overwritten by the upstream docs sync
function injectDeploymentGrid() {
  return (tree, file) => {
    if (!file.path || !/[\\/]docs[\\/]deployment\.md$/.test(file.path)) return;
    const headingIndex = tree.children.findIndex(
      (node) => node.type === 'heading' && node.depth === 2
        && node.children.some((child) => child.value === 'Deployment Methods'),
    );
    if (headingIndex === -1) return;
    tree.children.splice(headingIndex + 1, 0, {
      type: 'mdxJsxFlowElement',
      name: 'DeploymentMethods',
      attributes: [],
      children: [],
    });
  };
}

module.exports = injectDeploymentGrid;
