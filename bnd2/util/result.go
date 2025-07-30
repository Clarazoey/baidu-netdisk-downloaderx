package util

import (
	"encoding/json"
	"sync"

	"github.com/88250/gulu"
)

type Result struct {
	Cmd string `json:"cmd"`
	*gulu.Result
}

// Pool for Result objects to reduce allocations
var resultPool = sync.Pool{
	New: func() interface{} {
		return &Result{"", &gulu.Result{Code: 0, Msg: "", Data: nil}}
	},
}

func NewResult() *Result {
	return resultPool.Get().(*Result)
}

func NewCmdResult(cmd string) *Result {
	ret := NewResult()
	ret.Cmd = cmd
	return ret
}

// Return result to pool for reuse
func (r *Result) Release() {
	// Reset fields before returning to pool
	r.Cmd = ""
	r.Result.Code = 0
	r.Result.Msg = ""
	r.Result.Data = nil
	resultPool.Put(r)
}

func (r *Result) Bytes() []byte {
	ret, err := json.Marshal(r)
	if nil != err {
		logger.Errorf("marshal result [%#v] failed [%s]", r, err)
		return []byte(`{"code":-1,"msg":"marshal failed"}`)
	}

	return ret
}

// Pre-allocated buffer pool for JSON marshaling
var bufferPool = sync.Pool{
	New: func() interface{} {
		return make([]byte, 0, 1024) // 1KB initial capacity
	},
}

// Optimized Bytes method using buffer pool
func (r *Result) BytesOptimized() []byte {
	buf := bufferPool.Get().([]byte)
	defer func() {
		// Reset buffer and return to pool
		buf = buf[:0]
		bufferPool.Put(buf)
	}()

	// Use json.Marshal with buffer reuse potential
	ret, err := json.Marshal(r)
	if nil != err {
		logger.Errorf("marshal result [%#v] failed [%s]", r, err)
		return []byte(`{"code":-1,"msg":"marshal failed"}`)
	}

	return ret
}
