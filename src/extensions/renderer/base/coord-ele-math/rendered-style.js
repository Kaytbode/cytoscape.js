let BRp = {};

BRp.registerCalculationListeners = function(){
  let cy = this.cy;
  let elesToUpdate = cy.collection();
  let r = this;

  let enqueue = function( eles, dirtyStyleCaches = true ){
    elesToUpdate.merge( eles );

    if( dirtyStyleCaches ){
      for( let i = 0; i < eles.length; i++ ){
        let ele = eles[i];
        let _p = ele._private;
        let rstyle = _p.rstyle;

        rstyle.clean = false;
        rstyle.cleanConnected = false;
      }
    }
  };

  r.binder( cy )
    .on('bounds.* dirty.*', function onDirtyBounds( e ){
      let ele = e.target;

      enqueue( ele );
    })

    .on('style.* background.*', function onDirtyStyle( e ){
      let ele = e.target;

      enqueue( ele, false );
    })
  ;

  let updateEleCalcs = function( willDraw ){
    if( willDraw ){
      let fns = r.onUpdateEleCalcsFns;

      for( let i = 0; i < elesToUpdate.length; i++ ){
        let ele = elesToUpdate[i];
        let rstyle = ele._private.rstyle;

        if( ele.isNode() && !rstyle.cleanConnected ){
          enqueue( ele.connectedEdges() );

          rstyle.cleanConnected = true;
        }
      }

      if( fns ){ for( let i = 0; i < fns.length; i++ ){
        let fn = fns[i];

        fn( willDraw, elesToUpdate );
      } }

      r.recalculateRenderedStyle( elesToUpdate );

      elesToUpdate = cy.collection();
    }
  };

  r.flushRenderedStyleQueue = function(){
    updateEleCalcs(true);
  };

  r.beforeRender( updateEleCalcs, r.beforeRenderPriorities.eleCalcs );
};

BRp.onUpdateEleCalcs = function( fn ){
  let fns = this.onUpdateEleCalcsFns = this.onUpdateEleCalcsFns || [];

  fns.push( fn );
};

BRp.recalculateRenderedStyle = function( eles, useCache ){
  let edges = [];
  let nodes = [];

  // the renderer can't be used for calcs when destroyed, e.g. ele.boundingBox()
  if( this.destroyed ){ return; }

  // use cache by default for perf
  if( useCache === undefined ){ useCache = true; }

  for( let i = 0; i < eles.length; i++ ){
    let ele = eles[ i ];
    let _p = ele._private;
    let rstyle = _p.rstyle;

    // only update if dirty and in graph
    if( (useCache && rstyle.clean) || ele.removed() ){ continue; }

    // only update if not display: none
    if( ele.pstyle('display').value === 'none' ){ continue; }

    if( _p.group === 'nodes' ){
      nodes.push( ele );
    } else { // edges
      edges.push( ele );
    }

    rstyle.clean = true;
  }

  // update node data from projections
  for( let i = 0; i < nodes.length; i++ ){
    let ele = nodes[i];
    let _p = ele._private;
    let rstyle = _p.rstyle;
    let pos = ele.position();

    this.recalculateNodeLabelProjection( ele );

    rstyle.nodeX = pos.x;
    rstyle.nodeY = pos.y;
    rstyle.nodeW = ele.pstyle( 'width' ).pfValue;
    rstyle.nodeH = ele.pstyle( 'height' ).pfValue;
  }

  this.recalculateEdgeProjections( edges );

  // update edge data from projections
  for( let i = 0; i < edges.length; i++ ){
    let ele = edges[ i ];
    let _p = ele._private;
    let rstyle = _p.rstyle;
    let rs = _p.rscratch;

    // update rstyle positions
    rstyle.srcX = rs.arrowStartX;
    rstyle.srcY = rs.arrowStartY;
    rstyle.tgtX = rs.arrowEndX;
    rstyle.tgtY = rs.arrowEndY;
    rstyle.midX = rs.midX;
    rstyle.midY = rs.midY;
    rstyle.labelAngle = rs.labelAngle;
    rstyle.sourceLabelAngle = rs.sourceLabelAngle;
    rstyle.targetLabelAngle = rs.targetLabelAngle;
  }
};

export default BRp;
