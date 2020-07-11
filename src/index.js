import "./styles.css";

function Cluster() {
  const storage = {};
  const COUNTER_INDEX = 1;
  const bordersCounter = [[0, 3], [1, 4], [2, 5], [3, 0], [4, 1], [5, 2]];
  const borderDistances = [[2, 0], [1, 1], [-1, 1], [-2, 0], [-1, -1], [1, -1]];

  this.add = (newNode, neighboard) => {
    console.info("Create new node");
    if (!Object.keys(storage).length) {
      console.info("cluster is empty");
      storage[newNode.name] = {
        ...createNode(true, { x: 0, y: 0 })
      };
      console.info("Create [root] node success", newNode.name);
      return true;
    }
    // get target border
    const newNodeBorder = newNode.border;
    const targetNeightboardBorder = bordersCounter[newNodeBorder][1];
    const neightboardWithBorder = {
      name: neighboard,
      border: targetNeightboardBorder
    };
    const connsectSuccess = handleConnectNewNode(
      newNode,
      neightboardWithBorder
    );
    if (connsectSuccess) {
      handleCheckRelationByPosition(newNode.name);
    }
  };

  this.get = name => {
    if (!name) return storage;
    return storage[name];
  };

  this.remove = id => {
    /**
     * Acceptance:
     * - Never remove node if it's only connecting between two hotspot
     *
     * Todo:
     * - Check how many connection on target node
     * - if only one, we can delete it directly
     * - if more than one:
     * - we need to check if the target node
     *   is a single connector between the neighbour
     * - if it a single connector, return false / cannot to removed
     * - else we can remove it safely
     *
     * Algorithm to find path between neighbour of target node
     * EXAMPLE: a-b-c-d-e
     * if we wan to remove node c,
     * we need to check path from node b and d
     *
     * Possible algorithm to use: A* / BFS /DFS
     */

    let isAllowed = false;
    const nodeTarget = this.get(id);
    if (!nodeTarget) {
      console.error("target not found");
      return false;
    }
    const childTarget = Object.values(nodeTarget.borders);

    if (childTarget.length === 1) {
      isAllowed = true;
    } else {
      // remove child has neighbour
      const nodeToCheck = handleRemoveChildNeighbour(childTarget);
      const mappedNodes = mappingNode(nodeToCheck);

      const otherPathConnections = [];
      mappedNodes.forEach(([from, to]) => {
        // find another path connection
        const result = findPathBFS(from, to, id);
        if (result) {
          otherPathConnections.push(true);
        }
      });
      isAllowed = mappedNodes.length === otherPathConnections.length;
    }
    if (isAllowed) {
      handleRemoveFromNodes(nodeTarget, id);
    } else {
      console.error("node is not allowed to be remove");
    }
    return isAllowed;
  };

  // private method
  const createNode = (isRoot = false, initialPosition = null) => ({
    isRoot,
    borders: {},
    position: initialPosition
  });

  const findPathBFS = (from, to, skippedNode) => {
    const INCREMENT = 1; // increment cost
    const initialNode = [null, from.name, 0]; // from, to, cost
    // create queues
    const queue = new Queue();
    queue.enqueue(initialNode);
    // create stack visited
    const visited = new SimpleStack();

    let result = null;

    while (!queue.isEmpty() && !result) {
      // get and delete from the queue
      const x = queue.peek();
      queue.dequeue();
      // mark x as visited
      visited.push(x);
      // get successor
      const excludesChildCheck = [...visited.getElements()].map(
        item => item[1]
      );
      const skipped = [...excludesChildCheck, skippedNode];
      const successorX = findChilds(x[1], skipped)
        .map(item => [x[1], item.name, x[2] + INCREMENT])
        .sort((a, b) => a[2] - b[2]);
      // add successor to queue
      successorX.forEach(queue.enqueue);
      if (x[1] === to.name) {
        result = visited.getElements();
        queue.clearElements();
      }
    }
    return result;
  };

  function Queue() {
    let elements = [];

    this.enqueue = e => elements.push(e);
    this.dequeue = () => elements.shift();
    this.peek = () => elements[0];
    this.isEmpty = () => elements.length === 0;
    this.getElements = () => elements;
    this.clearElements = () => {
      elements = [];
    };
  }

  function SimpleStack() {
    const elements = [];
    const marker = [];
    const INDEX_ELEMENT_NAME = 1;

    this.push = element => {
      if (!marker.includes(element[INDEX_ELEMENT_NAME])) {
        marker.push(element[1]);
        elements.push(element);
      }
    };
    this.getElements = () => elements;
  }

  const findChilds = (nodeName, skipped = []) => {
    const node = this.get(nodeName);
    return node
      ? Object.values(node.borders).filter(item => !skipped.includes(item.name))
      : [];
  };

  const handleRemoveFromNodes = (node, key) => {
    const nodeBorders = Object.entries(node.borders);
    // delete from neighbour
    nodeBorders.forEach(([key, property]) => {
      const nodeNeighbour = this.get(property.name);
      const borderTarget = bordersCounter[key][COUNTER_INDEX];
      const newBorders = nodeNeighbour.borders;
      delete newBorders[borderTarget];

      // update borders
      nodeNeighbour.borders = newBorders;
      storage[property.name] = nodeNeighbour;
    });
    // delete on nodes
    delete storage[key];
  };

  const handleRemoveChildNeighbour = list => {
    const [startNode, ...rest] = list;
    let checkedList = [];
    rest.forEach(itemNode => {
      if (
        !isNeighboured(itemNode.name, startNode.name) &&
        !isListNeighboured(checkedList, itemNode.name)
      ) {
        checkedList = [...checkedList, itemNode];
      }
    });
    return [startNode, ...checkedList];
  };

  const isNeighboured = (firstNode, secondNode) => {
    const node = this.get(firstNode);
    const listNeighbour = Object.values(node.borders).map(each => each.name);
    return listNeighbour.includes(secondNode);
  };

  const isListNeighboured = (list, nodeName) => {
    const checkedList = list.map(item => {
      return isNeighboured(item.name, nodeName);
    });
    return !!checkedList.length;
  };

  const mappingNode = list => {
    let tempList = [...list];
    const mappedNode = [];
    for (let i = 0; i < list.length; i++) {
      const start = tempList.shift();
      if (tempList[0]) {
        tempList.forEach(item => {
          mappedNode.push([start, item]);
        });
      }
    }
    return mappedNode;
  };

  const handleConnectNewNode = (newNode, targetNode) => {
    const neighboardNode = storage[targetNode.name];
    if (!neighboardNode) {
      console.error("node target is not exist");
      return false;
    }
    if (neighboardNode.borders[targetNode.border]) {
      console.error("border has been used");
      return false;
    }
    if (storage[newNode.name]) {
      console.error("node has been exist");
      return false;
    }

    // create new position
    const [xTarget, yTarget] = borderDistances[targetNode.border];
    const newPosition = {
      x: xTarget + neighboardNode.position.x,
      y: yTarget + neighboardNode.position.y
    };
    // create new node
    const newNodeToConnect = createNode(false, newPosition);
    // set connected border
    newNodeToConnect.borders[newNode.border] = targetNode;
    // update to main nodes
    storage[newNode.name] = newNodeToConnect;

    // update connected border on the neighboard
    neighboardNode.borders[targetNode.border] = newNode;
    // task complete
    console.info("Create new node success:", newNode.name);
    return true;
  };

  const handleConnectExisting = (fromNode, toNode) => {
    const fromBorders = storage[fromNode.name].borders;
    if (fromBorders[fromNode.border]) {
      console.log("border has been used", 123);
      return false;
    }
    fromBorders[fromNode.border] = toNode;
    storage[fromNode.name].borders = fromBorders;

    const toBorders = storage[toNode.name].borders;
    toBorders[toNode.border] = fromNode;
    storage[toNode.name].borders = toBorders;
    console.log("success connected to", fromNode.name);
    return true;
  };

  const handleCheckRelationByPosition = newNodeName => {
    const currentPosition = storage[newNodeName].position;
    const { x, y } = currentPosition;
    const allX = [];
    const allY = [];
    let foundNeighbourd = [];

    const allNodeNeighbourd = borderDistances.map(([nodeX, nodeY]) => {
      let xNeighbour = x + nodeX;
      let yNeighbour = y + nodeY;
      allX.push(xNeighbour);
      allY.push(yNeighbour);
      const neighbour = {
        x: xNeighbour,
        y: yNeighbour
      };
      return JSON.stringify(neighbour);
    });

    const filter = {
      x: {
        min: Math.min(...allX),
        max: Math.max(...allX)
      },
      y: {
        min: Math.min(...allY),
        max: Math.max(...allY)
      }
    };

    // Find all neighboard nearest by range
    const nodes = Object.entries(storage);
    nodes.forEach(([key, item]) => {
      // cretae filter by range
      const filteredRange =
        item.position.x >= filter.x.min &&
        item.position.x <= filter.x.max &&
        item.position.y >= filter.y.min &&
        item.position.y <= filter.y.max;
      const foundMatchPosition = allNodeNeighbourd.includes(
        JSON.stringify(item.position)
      );
      if (filteredRange && foundMatchPosition) {
        foundNeighbourd.push({
          property: item,
          index: allNodeNeighbourd.indexOf(JSON.stringify(item.position)),
          key
        });
      }
    });

    foundNeighbourd.forEach(target => {
      const borderTarget = bordersCounter[target.index][COUNTER_INDEX];
      if (!storage[target.key].borders[borderTarget]) {
        const counterTarget = bordersCounter[borderTarget][COUNTER_INDEX];
        handleConnectExisting(
          { name: target.key, border: borderTarget },
          { name: newNodeName, border: counterTarget }
        );
      }
    });
  };
}

const hexaland = new Cluster();

// case 1 add
// const c1 = performance.now();
// hexaland.add({ name: "ax" });
// hexaland.add({ name: "bx", border: 4 }, "ax");
// hexaland.add({ name: "cx", border: 5 }, "bx");
// hexaland.add({ name: "dx", border: 0 }, "cx");
// hexaland.add({ name: "ex", border: 0 }, "dx");
// hexaland.add({ name: "fx", border: 1 }, "ex");
// hexaland.add({ name: "gx", border: 2 }, "fx");
// hexaland.add({ name: "tx", border: 0 }, "ax");
// const c1e = performance.now();
// console.log("case 1 running on ms:", (c1e - c1) / 1000);

// case 2 add
// hexaland.add({ name: "ax" });
// hexaland.add({ name: "bx", border: 4 }, "ax");
// hexaland.add({ name: "cx", border: 5 }, "bx");
// hexaland.add({ name: "dx", border: 0 }, "cx");
// hexaland.add({ name: "tx", border: 5 }, "ax");

// case 3 delete
const c3 = performance.now();
hexaland.add({ name: "a" });
hexaland.add({ name: "b", border: 4 }, "a");
hexaland.add({ name: "c", border: 5 }, "b");
hexaland.add({ name: "d", border: 4 }, "c");
hexaland.add({ name: "e", border: 5 }, "c");
hexaland.add({ name: "f", border: 0 }, "e");
hexaland.add({ name: "g", border: 1 }, "f");
hexaland.add({ name: "h", border: 2 }, "g");
hexaland.add({ name: "i", border: 0 }, "h");
hexaland.add({ name: "j", border: 2 }, "i");
hexaland.add({ name: "k", border: 3 }, "j");
hexaland.remove("c");
hexaland.remove("d");
hexaland.remove("i");
hexaland.remove("b");

const c3e = performance.now();
console.log("case 3 running on ms:", (c3e - c3) / 1000);

const showThis = hexaland.get();

document.getElementById("app").innerHTML = `
<h1>Data</h1>
<pre style="font-size: 14px;">
  ${JSON.stringify(showThis, null, 2)}
</pre>
`;
