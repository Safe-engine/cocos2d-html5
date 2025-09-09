/****************************************************************************
 * Converted to ES Module and TypeScript by GitHub Copilot
 ****************************************************************************/

import { cc } from './Boot';
import type { Director } from './Director';

export function installWebGLDirectorExtensions() {
    // Only apply for WebGL render type
    if (cc._renderType !== cc.game.RENDER_TYPE_WEBGL) {
        return;
    }

    // DirectorDelegate for custom projection
    export class DirectorDelegate {
        updateProjection(): void {}
    }
    cc.DirectorDelegate = DirectorDelegate;

    const _p = (cc.Director as any).prototype;

    function recursiveChild(node: any) {
        if (node && node._renderCmd) {
            node._renderCmd.setDirtyFlag(cc.Node._dirtyFlags.transformDirty);
            const children = node._children;
            for (let i = 0; i < children.length; i++) {
                recursiveChild(children[i]);
            }
        }
    }

    cc.eventManager.addCustomListener(cc.Director.EVENT_PROJECTION_CHANGED, () => {
        const director = cc.director;
        const stack = director._scenesStack;
        for (let i = 0; i < stack.length; i++) {
            recursiveChild(stack[i]);
        }
    });

    _p.setProjection = function (projection: number) {
        const _t = this as Director;
        const size = _t._winSizeInPoints;

        _t.setViewport();

        const view = _t._openGLView;
        const ox = view._viewPortRect.x / view._scaleX;
        const oy = view._viewPortRect.y / view._scaleY;

        switch (projection) {
            case cc.Director.PROJECTION_2D:
                cc.kmGLMatrixMode(cc.KM_GL_PROJECTION);
                cc.kmGLLoadIdentity();
                const orthoMatrix = cc.math.Matrix4.createOrthographicProjection(
                    0,
                    size.width,
                    0,
                    size.height,
                    -1024, 1024
                );
                cc.kmGLMultMatrix(orthoMatrix);
                cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW);
                cc.kmGLLoadIdentity();
                break;
            case cc.Director.PROJECTION_3D:
                const zeye = _t.getZEye();
                let matrixPerspective = cc.math.Matrix4.createPerspectiveProjection(60, size.width / size.height, 0.1, zeye * 2);
                cc.kmGLMatrixMode(cc.KM_GL_PROJECTION);
                cc.kmGLLoadIdentity();
                cc.kmGLMultMatrix(matrixPerspective);

                const eye = new cc.math.Vec3(-ox + size.width / 2, -oy + size.height / 2, zeye);
                const center = new cc.math.Vec3(-ox + size.width / 2, -oy + size.height / 2, 0.0);
                const up = new cc.math.Vec3(0.0, 1.0, 0.0);
                const matrixLookup = new cc.math.Matrix4();
                matrixLookup.lookAt(eye, center, up);
                cc.kmGLMultMatrix(matrixLookup);

                cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW);
                cc.kmGLLoadIdentity();
                break;
            case cc.Director.PROJECTION_CUSTOM:
                if (_t._projectionDelegate)
                    _t._projectionDelegate.updateProjection();
                break;
            default:
                cc.log(cc._LogInfos.Director_setProjection);
                break;
        }
        _t._projection = projection;
        cc.eventManager.dispatchEvent(_t._eventProjectionChanged);
        cc.setProjectionMatrixDirty();
        cc.renderer.childrenOrderDirty = true;
    };

    _p.setDepthTest = function (on: boolean) {
        cc.renderer.setDepthTest(on);
    };

    _p.setClearColor = function (clearColor: any) {
        cc.renderer._clearColor = clearColor;
    };

    _p.setOpenGLView = function (openGLView: any) {
        const _t = this as Director;
        _t._winSizeInPoints.width = cc._canvas.width;
        _t._winSizeInPoints.height = cc._canvas.height;
        _t._openGLView = openGLView || cc.view;

        // Configuration. Gather GPU info
        const conf = cc.configuration;
        conf.gatherGPUInfo();
        conf.dumpInfo();

        _t.setGLDefaultValues();

        if (cc.eventManager)
            cc.eventManager.setEnabled(true);
    };

    _p.getVisibleSize = function () {
        return this._openGLView.getVisibleSize();
    };

    _p.getVisibleOrigin = function () {
        return this._openGLView.getVisibleOrigin();
    };

    _p.getZEye = function () {
        return this._winSizeInPoints.height / 1.15469993750;
    };

    _p.setViewport = function () {
        const view = this._openGLView;
        if (view) {
            const locWinSizeInPoints = this._winSizeInPoints;
            view.setViewPortInPoints(
                -view._viewPortRect.x / view._scaleX,
                -view._viewPortRect.y / view._scaleY,
                locWinSizeInPoints.width,
                locWinSizeInPoints.height
            );
        }
    };

    _p.getOpenGLView = function () {
        return this._openGLView;
    };

    _p.getProjection = function () {
        return this._projection;
    };

    _p.setAlphaBlending = function (on: boolean) {
        if (on)
            cc.glBlendFunc(cc.BLEND_SRC, cc.BLEND_DST);
        else
            cc.glBlendFunc(cc._renderContext.ONE, cc._renderContext.ZERO);
    };

    _p.setGLDefaultValues = function () {
        const _t = this as Director;
        _t.setAlphaBlending(true);
        _t.setProjection(_t._projection);

        // set other opengl default values
        cc._renderContext.clearColor(0.0, 0.0, 0.0, 0.0);
    };
}

// Call this function after cc.Director is defined and cc._renderType is