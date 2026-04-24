//! 数据清洗操作 (Operations) 模块
//! 
//! 本模块按功能域划分了所有的清洗规则的具体实现，
//! 每个子模块对应一类特定的数据处理逻辑，以便于独立测试和维护。

pub mod columns;
pub mod format;
pub mod missing;
pub mod dedup;
